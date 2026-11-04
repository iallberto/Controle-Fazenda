import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { hojeLocal } from '../../common/datas';
import { Lactacao } from './entities/lactacao.entity';
import { Ordenha, TipoOrdenha } from './entities/ordenha.entity';
import {
  curvaDaLactacao,
  linhaDeProducao,
  periodoDiario,
  periodoMensal,
} from './dominio/producao';
import { VacasService } from './vacas.service';

// Último dia de um mês AAAA-MM
function fimDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return `${mes}-${String(ultimo).padStart(2, '0')}`;
}

// Litros do tanque e descartados, e vacas-dia em lactação, por dia do período.
// Agregado no SQL (research R10): uma passada nas ordenhas do período e uma
// junção das lactações com a série de dias.
const SQL_POR_DIA = `
  WITH dias AS (
    SELECT generate_series($2::date, $3::date, interval '1 day')::date AS d
  ),
  o AS (
    SELECT data,
           SUM(CASE WHEN descarte THEN 0 ELSE litros END) AS para_tanque,
           SUM(CASE WHEN descarte THEN litros ELSE 0 END) AS descartado
      FROM ordenhas
     WHERE fazenda_id = $1 AND data BETWEEN $2::date AND $3::date
     GROUP BY data
  ),
  v AS (
    SELECT dias.d, COUNT(l.id) AS vacas
      FROM dias
      LEFT JOIN lactacoes l
        ON l.fazenda_id = $1 AND l.inicio <= dias.d AND (l.fim IS NULL OR l.fim >= dias.d)
     GROUP BY dias.d
  )
  SELECT to_char(dias.d, 'YYYY-MM-DD') AS data,
         COALESCE(o.para_tanque, 0) AS para_tanque,
         COALESCE(o.descartado, 0) AS descartado,
         COALESCE(v.vacas, 0) AS vacas
    FROM dias
    LEFT JOIN o ON o.data = dias.d
    LEFT JOIN v ON v.d = dias.d
   ORDER BY dias.d`;

interface LinhaSql {
  data: string;
  para_tanque: string | number;
  descartado: string | number;
  vacas: string | number;
}

// Relatórios de produção e curva de lactação (spec 004, US5, FR-026 a FR-029)
@Injectable()
export class ProducaoService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
    private readonly vacasService: VacasService,
  ) {}

  private async porDia(fazendaId: string, de: string, ate: string) {
    const linhas: LinhaSql[] = await this.manager.query(SQL_POR_DIA, [fazendaId, de, ate]);
    return linhas.map((l) => ({
      data: l.data,
      paraTanque: Number(l.para_tanque),
      descartado: Number(l.descartado),
      vacas: Number(l.vacas),
    }));
  }

  async diaria(fazendaId: string, de?: string, ate?: string, hoje = hojeLocal()) {
    const periodo = periodoDiario(hoje, de, ate);
    const dias = await this.porDia(fazendaId, periodo.de, periodo.ate);
    const totais = dias.reduce(
      (s, d) => ({
        paraTanque: s.paraTanque + d.paraTanque,
        descartado: s.descartado + d.descartado,
        vacasDia: s.vacasDia + d.vacas,
      }),
      { paraTanque: 0, descartado: 0, vacasDia: 0 },
    );
    return {
      ...periodo,
      dias: dias.map((d) => ({
        data: d.data,
        vacasEmLactacao: d.vacas,
        ...linhaDeProducao(d.paraTanque, d.descartado, d.vacas),
      })),
      totais: linhaDeProducao(totais.paraTanque, totais.descartado, totais.vacasDia),
    };
  }

  async mensal(fazendaId: string, de?: string, ate?: string, hoje = hojeLocal()) {
    const periodo = periodoMensal(hoje, de, ate);
    const ultimoDia = fimDoMes(periodo.ate) > hoje ? hoje : fimDoMes(periodo.ate);
    const dias = await this.porDia(fazendaId, `${periodo.de}-01`, ultimoDia);
    const porMes = new Map<string, { paraTanque: number; descartado: number; vacasDia: number }>();
    for (let mes = periodo.de; mes <= periodo.ate; ) {
      porMes.set(mes, { paraTanque: 0, descartado: 0, vacasDia: 0 });
      const [a, m] = mes.split('-').map(Number);
      mes = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
    }
    for (const d of dias) {
      const acumulado = porMes.get(d.data.slice(0, 7));
      if (!acumulado) continue;
      acumulado.paraTanque += d.paraTanque;
      acumulado.descartado += d.descartado;
      acumulado.vacasDia += d.vacas;
    }
    const meses = [...porMes.entries()].map(([mes, v]) => ({
      mes,
      ...linhaDeProducao(v.paraTanque, v.descartado, v.vacasDia),
    }));
    const soma = [...porMes.values()].reduce(
      (s, v) => ({
        paraTanque: s.paraTanque + v.paraTanque,
        descartado: s.descartado + v.descartado,
        vacasDia: s.vacasDia + v.vacasDia,
      }),
      { paraTanque: 0, descartado: 0, vacasDia: 0 },
    );
    return {
      ...periodo,
      meses,
      totais: linhaDeProducao(soma.paraTanque, soma.descartado, soma.vacasDia),
    };
  }

  // Curva da lactação atual (ou da escolhida): litros por dia × DEL (FR-028)
  async curva(fazendaId: string, animalId: string, lactacaoId?: string, hoje = hojeLocal()) {
    await this.vacasService.buscarFemea(fazendaId, animalId);
    const lactacoes = await this.manager.find(Lactacao, {
      where: { animalId },
      order: { inicio: 'DESC' },
    });
    const lactacao = lactacaoId
      ? lactacoes.find((l) => l.id === lactacaoId)
      : (lactacoes.find((l) => l.fim === null) ?? lactacoes[0]);
    if (!lactacao) throw new NotFoundException('Lactação não encontrada');
    const ordenhas = await this.manager.find(Ordenha, {
      where: { lactacaoId: lactacao.id, tipo: TipoOrdenha.VACA },
    });
    const porDia = new Map<string, { litros: number; descarte: boolean }>();
    for (const o of ordenhas) {
      const dia = porDia.get(o.data) ?? { litros: 0, descarte: false };
      dia.litros += o.litros;
      dia.descarte = dia.descarte || o.descarte;
      porDia.set(o.data, dia);
    }
    const fim = lactacao.fim ?? hoje;
    return {
      lactacaoId: lactacao.id,
      inicio: lactacao.inicio,
      fim: lactacao.fim,
      pontos: curvaDaLactacao(lactacao.inicio, fim < lactacao.inicio ? lactacao.inicio : fim, porDia),
    };
  }

  // Lactações encerradas da vaca, com início, fim, dias e total (FR-028)
  async encerradas(fazendaId: string, animalId: string) {
    const vaca = await this.vacasService.detalhar(fazendaId, animalId);
    return vaca.encerradas;
  }
}
