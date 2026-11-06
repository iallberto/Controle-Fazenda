import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { somarDias } from '../../reproducao/dominio/datas';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { acessoDaFazenda, DIAS_CARENCIA } from '../../fazenda/acesso-fazenda';
import { AcessoFazendaService } from '../../fazenda/acesso-fazenda.service';
import { PapelUsuario, Usuario } from '../../usuario/entities/usuario.entity';
import { AcessoModulosService } from '../acesso/acesso-modulos.service';
import { ModuloFazenda } from '../acesso/entities/modulo-fazenda.entity';
import { MODULOS_PAGOS, ModuloPago } from '../acesso/modulo-pago';
import { ItemPlano, PrecoPlano } from './entities/preco-plano.entity';
import { RegistroAcesso, TipoRegistroAcesso } from './entities/registro-acesso.entity';

export const DIAS_TESTE = 30;
export const DIAS_RENOVACAO = 30;
const DIAS_PARA_VENCER_NA_LISTA = 7;

// Prazo de acesso das fazendas no painel (spec 008, US3): teste de 30 dias,
// pagamento por Pix confirmado à mão, extensão, cliente sem prazo, próximos a
// vencer e preços. Os módulos do plano acompanham o prazo, com a carência (R4).
@Injectable()
export class PrazoFazendasService {
  constructor(
    @InjectRepository(Fazenda)
    private readonly fazendaRepository: Repository<Fazenda>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(RegistroAcesso)
    private readonly registroRepository: Repository<RegistroAcesso>,
    @InjectRepository(PrecoPlano)
    private readonly precoRepository: Repository<PrecoPlano>,
    private readonly acessoModulos: AcessoModulosService,
  ) {}

  async liberarTeste(administradorId: string, fazendaId: string, modulos: ModuloPago[], hoje = hojeLocal()) {
    return this.mudarPrazo(fazendaId, async (manager, fazenda) => {
      if (fazenda.semPrazo || fazenda.acessoAte) {
        throw new ConflictException('A fazenda já tem prazo de acesso: use pagamento ou extensão');
      }
      const acessoAte = somarDias(hoje, DIAS_TESTE);
      fazenda.modulosPlano = [...new Set(modulos)].sort((a, b) => MODULOS_PAGOS.indexOf(a) - MODULOS_PAGOS.indexOf(b));
      fazenda.acessoAte = acessoAte;
      await manager.save(fazenda);
      await this.ajustarModulos(manager, administradorId, fazenda, somarDias(acessoAte, DIAS_CARENCIA), hoje);
      await this.registrar(manager, administradorId, fazenda, TipoRegistroAcesso.TESTE, null, acessoAte, null);
    });
  }

  async confirmarPagamento(administradorId: string, fazendaId: string, valorCentavos: number | undefined, hoje = hojeLocal()) {
    return this.mudarPrazo(fazendaId, async (manager, fazenda) => {
      if (fazenda.semPrazo) throw new ConflictException('Cliente sem prazo: não há o que renovar');
      if (!fazenda.acessoAte) throw new BadRequestException('Libere o teste da fazenda antes de registrar pagamento');
      const de = fazenda.acessoAte;
      const base = de >= hoje ? de : hoje;
      const acessoAte = somarDias(base, DIAS_RENOVACAO);
      const valor = valorCentavos ?? (await this.valorDoPlano(manager, fazenda.modulosPlano));
      fazenda.acessoAte = acessoAte;
      await manager.save(fazenda);
      await this.ajustarModulos(manager, administradorId, fazenda, somarDias(acessoAte, DIAS_CARENCIA), hoje);
      await this.registrar(manager, administradorId, fazenda, TipoRegistroAcesso.PAGAMENTO, de, acessoAte, valor);
    });
  }

  async estenderPrazo(administradorId: string, fazendaId: string, acessoAte: string, hoje = hojeLocal()) {
    if (acessoAte < hoje) throw new BadRequestException('A nova data não pode ser no passado');
    return this.mudarPrazo(fazendaId, async (manager, fazenda) => {
      if (fazenda.semPrazo) throw new ConflictException('Cliente sem prazo: não há o que estender');
      const de = fazenda.acessoAte;
      fazenda.acessoAte = acessoAte;
      await manager.save(fazenda);
      await this.ajustarModulos(manager, administradorId, fazenda, somarDias(acessoAte, DIAS_CARENCIA), hoje);
      await this.registrar(manager, administradorId, fazenda, TipoRegistroAcesso.EXTENSAO, de, acessoAte, null);
    });
  }

  async tornarSemPrazo(administradorId: string, fazendaId: string, hoje = hojeLocal()) {
    return this.mudarPrazo(fazendaId, async (manager, fazenda) => {
      if (fazenda.semPrazo) throw new ConflictException('A fazenda já é cliente sem prazo');
      const de = fazenda.acessoAte;
      fazenda.semPrazo = true;
      await manager.save(fazenda);
      await this.ajustarModulos(manager, administradorId, fazenda, null, hoje);
      await this.registrar(manager, administradorId, fazenda, TipoRegistroAcesso.SEM_PRAZO, de, null, null);
    });
  }

  async alterarTelefone(fazendaId: string, telefoneContato: string | null) {
    const fazenda = await this.buscar(fazendaId);
    fazenda.telefoneContato = telefoneContato?.trim() || null;
    await this.fazendaRepository.save(fazenda);
    return { telefoneContato: fazenda.telefoneContato };
  }

  // Situação do prazo e histórico, para o detalhe da fazenda no painel
  async prazoDaFazenda(fazendaId: string, hoje = hojeLocal()) {
    const fazenda = await this.buscar(fazendaId);
    const registros = await this.registroRepository.find({
      where: { fazendaId },
      relations: { administrador: true },
      order: { criadoEm: 'DESC' },
      take: 20,
    });
    return {
      ...acessoDaFazenda(fazenda, hoje),
      semPrazo: fazenda.semPrazo,
      modulosPlano: fazenda.modulosPlano,
      telefoneContato: fazenda.telefoneContato,
      valorCentavos: await this.valorDoPlano(this.fazendaRepository.manager, fazenda.modulosPlano),
      registros: registros.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        de: r.de,
        ate: r.ate,
        modulos: r.modulos,
        valorCentavos: r.valorCentavos,
        administrador: r.administrador?.nome ?? null,
        criadoEm: r.criadoEm,
      })),
    };
  }

  // Fazendas com prazo nos próximos 7 dias, em carência ou vencidas (FR-012c)
  async vencimentos(hoje = hojeLocal()) {
    const fazendas = await this.fazendaRepository.find({
      where: {
        semPrazo: false,
        acessoAte: LessThanOrEqual(somarDias(hoje, DIAS_PARA_VENCER_NA_LISTA)),
      },
      order: { acessoAte: 'ASC' },
    });
    const comPrazo = fazendas.filter((f) => f.acessoAte);
    return Promise.all(
      comPrazo.map(async (f) => {
        const dono = await this.usuarioRepository.findOne({
          where: { fazendaId: f.id, papel: PapelUsuario.DONO, ativo: true, suporte: false },
          order: { criadoEm: 'ASC' },
        });
        return {
          fazendaId: f.id,
          nome: f.nome,
          dono: dono ? { nome: dono.nome, email: dono.email } : null,
          telefoneContato: f.telefoneContato,
          ...acessoDaFazenda(f, hoje),
          valorCentavos: await this.valorDoPlano(this.fazendaRepository.manager, f.modulosPlano),
        };
      }),
    );
  }

  async precos() {
    const precos = await this.precoRepository.find();
    return Object.fromEntries(Object.values(ItemPlano).map((item) => [item, precos.find((p) => p.item === item)?.valorCentavos ?? 0]));
  }

  async salvarPrecos(valores: Partial<Record<ItemPlano, number>>) {
    for (const item of Object.values(ItemPlano)) {
      const valor = valores[item];
      if (valor === undefined) continue;
      if (!Number.isInteger(valor) || valor < 0) throw new BadRequestException('Preço inválido');
      await this.precoRepository.save({ item, valorCentavos: valor });
    }
    return this.precos();
  }

  private async mudarPrazo(fazendaId: string, mudanca: (manager: EntityManager, fazenda: Fazenda) => Promise<void>) {
    await this.fazendaRepository.manager.transaction(async (manager) => {
      const fazenda = await manager.findOne(Fazenda, {
        where: { id: fazendaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fazenda) throw new NotFoundException('Fazenda não encontrada');
      await mudanca(manager, fazenda);
    });
    AcessoFazendaService.limparCache(fazendaId);
    this.acessoModulos.limparCache(fazendaId);
    return this.prazoDaFazenda(fazendaId);
  }

  // Períodos dos módulos do plano terminam junto com a carência (ou sem término,
  // no cliente sem prazo): estende o período vigente ou abre um novo a partir de hoje
  private async ajustarModulos(
    manager: EntityManager,
    administradorId: string,
    fazenda: Fazenda,
    termino: string | null,
    hoje: string,
  ) {
    for (const modulo of fazenda.modulosPlano) {
      const vigente = await manager.findOne(ModuloFazenda, {
        where: { fazendaId: fazenda.id, modulo, desativadoEm: IsNull(), dataInicio: LessThanOrEqual(hoje) },
        order: { dataInicio: 'DESC' },
      });
      if (vigente && (vigente.dataTermino === null || vigente.dataTermino >= hoje)) {
        await manager.update(ModuloFazenda, { id: vigente.id }, { dataTermino: termino });
      } else {
        await manager.insert(ModuloFazenda, {
          fazendaId: fazenda.id,
          modulo,
          dataInicio: hoje,
          dataTermino: termino,
          liberadoPorId: administradorId,
        });
      }
    }
  }

  private registrar(
    manager: EntityManager,
    administradorId: string,
    fazenda: Fazenda,
    tipo: TipoRegistroAcesso,
    de: string | null,
    ate: string | null,
    valorCentavos: number | null,
  ) {
    return manager.insert(RegistroAcesso, {
      fazendaId: fazenda.id,
      tipo,
      de,
      ate,
      modulos: fazenda.modulosPlano,
      valorCentavos,
      administradorId,
    });
  }

  private async valorDoPlano(manager: EntityManager, modulosPlano: string[]) {
    const precos = await manager.find(PrecoPlano);
    const preco = (item: string) => precos.find((p) => p.item === item)?.valorCentavos ?? 0;
    return preco(ItemPlano.PACOTE_INICIAL) + modulosPlano.reduce((total, m) => total + preco(m), 0);
  }

  private async buscar(fazendaId: string) {
    const fazenda = await this.fazendaRepository.findOneBy({ id: fazendaId });
    if (!fazenda) throw new NotFoundException('Fazenda não encontrada');
    return fazenda;
  }
}
