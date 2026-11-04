import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { ModuloFazenda } from './entities/modulo-fazenda.entity';
import {
  MODULOS_PAGOS,
  type ModuloPago,
  type SituacaoModulo,
} from './modulo-pago';
import { situacaoDoModulo, type PeriodoModulo } from './situacao-modulo';

// Cache curto: liberar ou desativar vale em no máximo 1 minuto mesmo com mais
// de uma instância; na própria instância, limparCache vale na hora (FR-011).
const VALIDADE_CACHE_MS = 60_000;

type PeriodoComModulo = PeriodoModulo & { modulo: ModuloPago };

// Situação dos módulos pagos de cada fazenda (research R3 e R5).
@Injectable()
export class AcessoModulosService {
  private readonly cache = new Map<
    string,
    { expiraEm: number; periodos: PeriodoComModulo[] }
  >();

  constructor(
    @InjectRepository(ModuloFazenda)
    private readonly moduloFazendaRepository: Repository<ModuloFazenda>,
  ) {}

  // Os três módulos, sempre na mesma ordem, para a tela da fazenda (FR-013)
  async listar(fazendaId: string, hoje = hojeLocal()) {
    const periodos = await this.periodos(fazendaId);
    return MODULOS_PAGOS.map((modulo) => ({
      modulo,
      ...situacaoDoModulo(
        periodos.filter((p) => p.modulo === modulo),
        hoje,
      ),
    }));
  }

  async situacao(
    fazendaId: string,
    modulo: ModuloPago,
    hoje = hojeLocal(),
  ): Promise<SituacaoModulo> {
    const periodos = await this.periodos(fazendaId);
    return situacaoDoModulo(
      periodos.filter((p) => p.modulo === modulo),
      hoje,
    ).situacao;
  }

  // Chamado ao liberar, desativar, suspender ou reativar
  limparCache(fazendaId: string) {
    this.cache.delete(fazendaId);
  }

  private async periodos(fazendaId: string) {
    const guardado = this.cache.get(fazendaId);
    if (guardado && guardado.expiraEm > Date.now()) return guardado.periodos;

    const registros = await this.moduloFazendaRepository.find({
      where: { fazendaId },
    });
    const periodos = registros.map((r) => ({
      modulo: r.modulo,
      dataInicio: r.dataInicio,
      dataTermino: r.dataTermino,
      desativadoEm: r.desativadoEm,
    }));
    this.cache.set(fazendaId, {
      expiraEm: Date.now() + VALIDADE_CACHE_MS,
      periodos,
    });
    return periodos;
  }
}
