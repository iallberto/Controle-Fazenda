import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { gerarSenhaProvisoria } from '../../auth/senha-provisoria';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { PapelUsuario, Usuario } from '../../usuario/entities/usuario.entity';
import { AcessoModulosService } from '../acesso/acesso-modulos.service';
import { ModuloFazenda } from '../acesso/entities/modulo-fazenda.entity';
import { MODULOS_PAGOS, type ModuloPago } from '../acesso/modulo-pago';
import { situacaoDoModulo } from '../acesso/situacao-modulo';
import { SuspensaoFazenda } from './entities/suspensao-fazenda.entity';

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Painel do administrador: fazendas clientes, módulos e suspensão
// (FR-019 a FR-027). Nunca lê animais, partos, pesagens ou qualquer dado de
// rebanho (FR-021): só fazenda, contagem de usuários, módulos e suspensões.
@Injectable()
export class AdminFazendasService {
  constructor(
    @InjectRepository(Fazenda)
    private readonly fazendaRepository: Repository<Fazenda>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(ModuloFazenda)
    private readonly moduloRepository: Repository<ModuloFazenda>,
    @InjectRepository(SuspensaoFazenda)
    private readonly suspensaoRepository: Repository<SuspensaoFazenda>,
    private readonly acesso: AcessoModulosService,
  ) {}

  // Fazenda nova com o dono (spec 007, FR-023): o cadastro público acabou. O
  // dono recebe uma senha provisória e troca no primeiro login.
  async criarFazenda(dto: { nomeFazenda: string; nomeDono: string; emailDono: string }) {
    const senhaProvisoria = gerarSenhaProvisoria();
    const senhaHash = await bcrypt.hash(senhaProvisoria, 10);
    const fazendaId = await this.fazendaRepository.manager.transaction(async (manager) => {
      if (await manager.findOne(Usuario, { where: { email: dto.emailDono } })) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
      const fazenda = await manager.save(manager.create(Fazenda, { nome: dto.nomeFazenda.trim() }));
      await manager.save(
        manager.create(Usuario, {
          fazendaId: fazenda.id,
          nome: dto.nomeDono.trim(),
          email: dto.emailDono,
          senhaHash,
          papel: PapelUsuario.DONO,
          criadoPorId: null,
          precisaTrocarSenha: true,
        }),
      );
      return fazenda.id;
    });
    return { fazendaId, senhaProvisoria };
  }

  // O administrador redefine a senha do dono (spec 007, FR-003, FR-004): o dono
  // ativo mais antigo da fazenda recebe uma senha provisória
  async redefinirSenhaDono(fazendaId: string) {
    await this.buscarFazenda(fazendaId);
    const dono = await this.usuarioRepository.findOne({
      where: { fazendaId, papel: PapelUsuario.DONO, ativo: true, suporte: false },
      order: { criadoEm: 'ASC' },
    });
    if (!dono) throw new NotFoundException('A fazenda não tem dono ativo');
    const senhaProvisoria = gerarSenhaProvisoria();
    dono.senhaHash = await bcrypt.hash(senhaProvisoria, 10);
    dono.precisaTrocarSenha = true;
    dono.senhaAlteradaEm = new Date();
    await this.usuarioRepository.save(dono);
    return { senhaProvisoria, dono: { nome: dono.nome, email: dono.email } };
  }

  async listar(busca?: string, hoje = hojeLocal()) {
    const [fazendas, periodos, usuarios] = await Promise.all([
      this.fazendaRepository.find({ order: { nome: 'ASC' } }),
      this.moduloRepository.find(),
      this.usuarioRepository
        .createQueryBuilder('usuario')
        .select('usuario.fazendaId', 'fazendaId')
        .addSelect('COUNT(*)', 'total')
        .where('usuario.ativo = true')
        .andWhere('usuario.suporte = false')
        .groupBy('usuario.fazendaId')
        .getRawMany<{ fazendaId: string; total: string }>(),
    ]);
    const termo = busca?.trim() ? semAcento(busca.trim()) : null;
    const ativosPorFazenda = new Map(
      usuarios.map((u) => [u.fazendaId, Number(u.total)]),
    );

    return fazendas
      .filter((fazenda) => !termo || semAcento(fazenda.nome).includes(termo))
      .map((fazenda) => ({
        id: fazenda.id,
        nome: fazenda.nome,
        criadaEm: fazenda.criadoEm,
        usuariosAtivos: ativosPorFazenda.get(fazenda.id) ?? 0,
        suspensa: fazenda.suspensa,
        modulos: this.situacoes(
          periodos.filter((p) => p.fazendaId === fazenda.id),
          hoje,
        ),
      }));
  }

  async detalhar(fazendaId: string, hoje = hojeLocal()) {
    const fazenda = await this.buscarFazenda(fazendaId);
    const [periodos, suspensoes, usuariosAtivos] = await Promise.all([
      this.moduloRepository.find({
        where: { fazendaId },
        relations: { liberadoPor: true, desativadoPor: true },
        order: { liberadoEm: 'DESC' },
      }),
      this.suspensaoRepository.find({
        where: { fazendaId },
        relations: { suspensaPor: true, reativadaPor: true },
        order: { suspensaEm: 'DESC' },
      }),
      this.usuarioRepository.countBy({ fazendaId, ativo: true, suporte: false }),
    ]);

    return {
      id: fazenda.id,
      nome: fazenda.nome,
      criadaEm: fazenda.criadoEm,
      usuariosAtivos,
      suspensa: fazenda.suspensa,
      modulos: this.situacoes(periodos, hoje),
      periodos: periodos.map((p) => ({
        id: p.id,
        modulo: p.modulo,
        dataInicio: p.dataInicio,
        dataTermino: p.dataTermino,
        liberadoPor: p.liberadoPor?.nome ?? null,
        liberadoEm: p.liberadoEm,
        desativadoPor: p.desativadoPor?.nome ?? null,
        desativadoEm: p.desativadoEm,
      })),
      suspensoes: suspensoes.map((s) => ({
        id: s.id,
        motivo: s.motivo,
        suspensaPor: s.suspensaPor?.nome ?? null,
        suspensaEm: s.suspensaEm,
        reativadaPor: s.reativadaPor?.nome ?? null,
        reativadaEm: s.reativadaEm,
      })),
    };
  }

  // Um período por vez: não pode haver outro vigente ou futuro (FR-020)
  async liberar(
    administradorId: string,
    fazendaId: string,
    dto: { modulo: ModuloPago; dataInicio: string; dataTermino?: string },
    hoje = hojeLocal(),
  ) {
    if (dto.dataTermino && dto.dataTermino < dto.dataInicio) {
      throw new BadRequestException(
        'A data de término não pode ser anterior à de início',
      );
    }
    await this.fazendaRepository.manager.transaction(async (manager) => {
      await this.travarFazenda(manager, fazendaId);
      const periodos = await manager.find(ModuloFazenda, {
        where: { fazendaId, modulo: dto.modulo },
      });
      const emAberto = periodos.some(
        (p) => !p.desativadoEm && (!p.dataTermino || p.dataTermino >= hoje),
      );
      if (emAberto) {
        throw new ConflictException(
          'Este módulo já está liberado para esta fazenda',
        );
      }
      await manager.insert(ModuloFazenda, {
        fazendaId,
        modulo: dto.modulo,
        dataInicio: dto.dataInicio,
        dataTermino: dto.dataTermino ?? null,
        liberadoPorId: administradorId,
      });
    });
    this.acesso.limparCache(fazendaId);
    return { liberado: true };
  }

  async desativar(administradorId: string, periodoId: string) {
    const periodo = await this.moduloRepository.findOne({
      where: { id: periodoId },
    });
    if (!periodo) throw new NotFoundException('Liberação não encontrada');
    if (periodo.desativadoEm) {
      throw new BadRequestException('Este módulo já foi desativado');
    }
    await this.moduloRepository.update(
      { id: periodoId },
      { desativadoPorId: administradorId, desativadoEm: new Date() },
    );
    this.acesso.limparCache(periodo.fazendaId);
    return { desativado: true };
  }

  // Ninguém da fazenda entra até reativar; nenhum dado é apagado (FR-025 a FR-027)
  async suspender(administradorId: string, fazendaId: string, motivo: string) {
    await this.fazendaRepository.manager.transaction(async (manager) => {
      const fazenda = await this.travarFazenda(manager, fazendaId);
      if (fazenda.suspensa) {
        throw new BadRequestException('Esta fazenda já está suspensa');
      }
      await manager.insert(SuspensaoFazenda, {
        fazendaId,
        motivo: motivo.trim(),
        suspensaPorId: administradorId,
      });
      await manager.update(Fazenda, { id: fazendaId }, { suspensa: true });
    });
    this.acesso.limparCache(fazendaId);
    return { suspensa: true };
  }

  async reativar(administradorId: string, fazendaId: string) {
    await this.fazendaRepository.manager.transaction(async (manager) => {
      const fazenda = await this.travarFazenda(manager, fazendaId);
      if (!fazenda.suspensa) {
        throw new BadRequestException('Esta fazenda não está suspensa');
      }
      const aberta = await manager.findOne(SuspensaoFazenda, {
        where: { fazendaId, reativadaEm: IsNull() },
        order: { suspensaEm: 'DESC' },
      });
      if (aberta) {
        await manager.update(
          SuspensaoFazenda,
          { id: aberta.id },
          { reativadaPorId: administradorId, reativadaEm: new Date() },
        );
      }
      await manager.update(Fazenda, { id: fazendaId }, { suspensa: false });
    });
    this.acesso.limparCache(fazendaId);
    return { suspensa: false };
  }

  private situacoes(
    periodos: Pick<
      ModuloFazenda,
      'modulo' | 'dataInicio' | 'dataTermino' | 'desativadoEm'
    >[],
    hoje: string,
  ) {
    return MODULOS_PAGOS.map((modulo) => ({
      modulo,
      ...situacaoDoModulo(
        periodos.filter((p) => p.modulo === modulo),
        hoje,
      ),
    }));
  }

  private async buscarFazenda(fazendaId: string) {
    const fazenda = await this.fazendaRepository.findOneBy({ id: fazendaId });
    if (!fazenda) throw new NotFoundException('Fazenda não encontrada');
    return fazenda;
  }

  // Lock da linha da fazenda: duas liberações ou suspensões ao mesmo tempo
  // não passam juntas pela checagem
  private async travarFazenda(manager: EntityManager, fazendaId: string) {
    const fazenda = await manager.findOne(Fazenda, {
      where: { id: fazendaId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!fazenda) throw new NotFoundException('Fazenda não encontrada');
    return fazenda;
  }
}
