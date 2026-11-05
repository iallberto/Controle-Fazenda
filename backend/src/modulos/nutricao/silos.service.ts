import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { Insumo, TipoInsumo, UnidadeBase } from './entities/insumo.entity';
import { MotivoMovimento, MovimentoInsumo, TipoMovimento } from './entities/movimento-insumo.entity';
import { Silo } from './entities/silo.entity';
import { normalizarNome, previsaoSilo } from './dominio/regras';
import { ehDono } from './estoque-base';
import { CriarSiloDto, EditarSiloDto } from './dto/nutricao.dto';

export type SituacaoSilo = 'FECHADO' | 'ABERTO' | 'ENCERRADO';

const situacaoDo = (silo: Silo): SituacaoSilo =>
  silo.encerramento ? 'ENCERRADO' : silo.abertura ? 'ABERTO' : 'FECHADO';

// Silos (spec 005, US3, FR-016 a FR-019; research R6). Fechado é reserva; a
// abertura lança a entrada de produção própria (silagem em kg) no estoque.
@Injectable()
export class SilosService {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  async listar(fazendaId: string, papel: string, hoje = hojeLocal()) {
    const silos = await this.manager.find(Silo, {
      where: { fazendaId },
      relations: { insumo: true },
      order: { fechamento: 'DESC' },
    });
    const ids = silos.map((s) => s.id);
    const baixas = ids.length
      ? await this.manager.find(MovimentoInsumo, {
          where: {
            siloId: In(ids),
            tipo: TipoMovimento.BAIXA,
            cancelamento: { cancelado: false },
          },
        })
      : [];
    const ordem: Record<SituacaoSilo, number> = { ABERTO: 0, FECHADO: 1, ENCERRADO: 2 };
    return silos
      .map((silo) => {
        const situacao = situacaoDo(silo);
        const previsao = previsaoSilo(
          silo.toneladasEnsiladas * 1000,
          baixas.filter((b) => b.siloId === silo.id),
          hoje,
        );
        return {
          id: silo.id,
          nome: silo.nome,
          tipo: silo.tipo,
          insumo: silo.insumo ? { id: silo.insumo.id, nome: silo.insumo.nome } : null,
          toneladasEnsiladas: silo.toneladasEnsiladas,
          fechamento: silo.fechamento,
          abertura: silo.abertura,
          encerramento: silo.encerramento,
          situacao,
          ...(situacao === 'FECHADO'
            ? { consumidoKg: 0, saldoKg: silo.toneladasEnsiladas * 1000, mediaKgDia: null, diasRestantes: null, acabaEm: null }
            : situacao === 'ENCERRADO'
              ? { ...previsao, diasRestantes: null, acabaEm: null }
              : previsao),
          ...(ehDono(papel) ? { custoEnsilagemCentavos: silo.custoEnsilagemCentavos } : {}),
        };
      })
      .sort((a, b) => ordem[a.situacao] - ordem[b.situacao]);
  }

  async criar(fazendaId: string, usuarioId: string, dto: CriarSiloDto, hoje = hojeLocal()) {
    if (dto.fechamento > hoje) throw new BadRequestException('O fechamento não pode ser no futuro');
    await this.insumoDeSilagem(fazendaId, dto.insumoId);
    await this.garantirNomeLivre(fazendaId, dto.nome);
    const silo = await this.manager.save(
      this.manager.create(Silo, {
        fazendaId,
        insumoId: dto.insumoId,
        nome: dto.nome,
        tipo: dto.tipo,
        toneladasEnsiladas: dto.toneladasEnsiladas,
        custoEnsilagemCentavos: dto.custoEnsilagemCentavos ?? null,
        fechamento: dto.fechamento,
        abertura: null,
        encerramento: null,
        entradaId: null,
        criadoPorId: usuarioId,
      }),
    );
    return { id: silo.id, nome: silo.nome };
  }

  // Toneladas e custo mudam só com o silo fechado (depois, valem pela entrada da abertura)
  async editar(fazendaId: string, usuarioId: string, id: string, dto: EditarSiloDto) {
    const silo = await this.buscar(fazendaId, id);
    if (dto.nome !== undefined && normalizarNome(dto.nome) !== normalizarNome(silo.nome)) {
      await this.garantirNomeLivre(fazendaId, dto.nome, id);
      silo.nome = dto.nome;
    }
    if (dto.toneladasEnsiladas !== undefined || dto.custoEnsilagemCentavos !== undefined) {
      if (silo.abertura) {
        throw new BadRequestException('Silo aberto: toneladas e custo não mudam mais');
      }
      if (dto.toneladasEnsiladas !== undefined) silo.toneladasEnsiladas = dto.toneladasEnsiladas;
      if (dto.custoEnsilagemCentavos !== undefined) silo.custoEnsilagemCentavos = dto.custoEnsilagemCentavos;
    }
    silo.atualizadoPorId = usuarioId;
    await this.manager.save(silo);
    return { id, nome: silo.nome };
  }

  // Abrir = lançar a entrada de produção própria com as toneladas (FR-017)
  async abrir(fazendaId: string, usuarioId: string, id: string, data: string, hoje = hojeLocal()) {
    return this.manager.transaction(async (manager) => {
      const silo = await manager.findOne(Silo, { where: { id } });
      if (!silo || silo.fazendaId !== fazendaId) throw new NotFoundException('Silo não encontrado');
      if (silo.abertura) throw new BadRequestException('O silo já foi aberto');
      if (data > hoje) throw new BadRequestException('A abertura não pode ser no futuro');
      if (data < silo.fechamento) throw new BadRequestException('A abertura não pode ser antes do fechamento');
      const insumo = await manager.findOne(Insumo, { where: { id: silo.insumoId }, relations: { unidades: true } });
      const kg = insumo?.unidades?.find((u) => u.fator === 1);
      if (!kg) throw new BadRequestException('O insumo de silagem precisa da unidade kg');
      const entrada = await manager.save(
        manager.create(MovimentoInsumo, {
          fazendaId,
          insumoId: silo.insumoId,
          data,
          tipo: TipoMovimento.ENTRADA,
          motivo: MotivoMovimento.SILO,
          quantidade: silo.toneladasEnsiladas * 1000,
          unidadeId: kg.id,
          quantidadeBase: silo.toneladasEnsiladas * 1000,
          valorCentavos: silo.custoEnsilagemCentavos,
          aguardandoPreco: false,
          fornecedor: null,
          observacao: `Abertura do silo ${silo.nome}`,
          siloId: silo.id,
          fornecimentoItemId: null,
          criadoPorId: usuarioId,
        }),
      );
      silo.abertura = data;
      silo.entradaId = entrada.id;
      silo.atualizadoPorId = usuarioId;
      await manager.save(silo);
      return { id, abertura: data, entradaKg: entrada.quantidadeBase };
    });
  }

  // Só sem silagem fornecida do silo; cancela a entrada da abertura
  async cancelarAbertura(fazendaId: string, usuarioId: string, id: string, motivo: string) {
    return this.manager.transaction(async (manager) => {
      const silo = await manager.findOne(Silo, { where: { id } });
      if (!silo || silo.fazendaId !== fazendaId) throw new NotFoundException('Silo não encontrado');
      if (!silo.abertura || silo.encerramento) {
        throw new BadRequestException('Só um silo aberto pode ter a abertura cancelada');
      }
      const baixas = await manager.find(MovimentoInsumo, {
        where: { siloId: id, tipo: TipoMovimento.BAIXA, cancelamento: { cancelado: false } },
      });
      if (baixas.length > 0) {
        throw new ConflictException('Já saiu silagem deste silo: cancele os tratos antes');
      }
      if (silo.entradaId) {
        const entrada = await manager.findOne(MovimentoInsumo, { where: { id: silo.entradaId } });
        if (entrada) {
          entrada.cancelamento = {
            cancelado: true,
            canceladoEm: new Date(),
            canceladoPorId: usuarioId,
            motivoCancelamento: motivo,
          };
          entrada.atualizadoPorId = usuarioId;
          await manager.save(entrada);
        }
      }
      silo.abertura = null;
      silo.entradaId = null;
      silo.atualizadoPorId = usuarioId;
      await manager.save(silo);
      return { id, situacao: 'FECHADO' };
    });
  }

  async encerrar(fazendaId: string, usuarioId: string, id: string, data: string, hoje = hojeLocal()) {
    const silo = await this.buscar(fazendaId, id);
    if (!silo.abertura || silo.encerramento) throw new BadRequestException('Só um silo aberto pode ser encerrado');
    if (data > hoje || data < silo.abertura) {
      throw new BadRequestException('O encerramento é entre a abertura e hoje');
    }
    silo.encerramento = data;
    silo.atualizadoPorId = usuarioId;
    await this.manager.save(silo);
    return { id, encerramento: data };
  }

  private async buscar(fazendaId: string, id: string) {
    const silo = await this.manager.findOne(Silo, { where: { id } });
    if (!silo || silo.fazendaId !== fazendaId) throw new NotFoundException('Silo não encontrado');
    return silo;
  }

  private async insumoDeSilagem(fazendaId: string, insumoId: string) {
    const insumo = await this.manager.findOne(Insumo, { where: { id: insumoId } });
    if (!insumo || insumo.fazendaId !== fazendaId) throw new NotFoundException('Insumo não encontrado');
    if (insumo.tipo !== TipoInsumo.SILAGEM || insumo.unidadeBase !== UnidadeBase.KG) {
      throw new BadRequestException('O silo é de um insumo do tipo silagem, em kg');
    }
    return insumo;
  }

  private async garantirNomeLivre(fazendaId: string, nome: string, exceto?: string) {
    const silos = await this.manager.find(Silo, { where: { fazendaId } });
    if (silos.some((s) => s.id !== exceto && normalizarNome(s.nome) === normalizarNome(nome))) {
      throw new ConflictException('Já existe um silo com este nome');
    }
  }
}
