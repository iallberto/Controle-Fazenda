import { BadRequestException } from '@nestjs/common';
import { diasEntre, somarDias } from '../../../reproducao/dominio/datas';

// Regras puras dos relatórios de produção (spec 004, FR-026 a FR-028; R10)

export const MAX_DIAS_DIARIO = 92;
export const MAX_MESES_MENSAL = 36;

const arredondar = (valor: number) => Math.round(valor * 10) / 10;

export function somarMeses(mes: string, quantidade: number) {
  const [ano, m] = mes.split('-').map(Number);
  const total = ano * 12 + (m - 1) + quantidade;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

// Período do relatório diário: padrão do dia 1 do mês até hoje; no máximo 92 dias
export function periodoDiario(hoje: string, de?: string, ate?: string) {
  const fim = ate ?? hoje;
  const inicio = de ?? `${fim.slice(0, 7)}-01`;
  if (inicio > fim) throw new BadRequestException('O início do período é depois do fim');
  if (diasEntre(inicio, fim) + 1 > MAX_DIAS_DIARIO) {
    throw new BadRequestException(`O relatório diário vai até ${MAX_DIAS_DIARIO} dias`);
  }
  return { de: inicio, ate: fim };
}

// Período do relatório mensal: padrão os 12 meses até o mês de hoje; no máximo 36
export function periodoMensal(hoje: string, de?: string, ate?: string) {
  const fim = ate ?? hoje.slice(0, 7);
  const inicio = de ?? somarMeses(fim, -11);
  if (inicio > fim) throw new BadRequestException('O início do período é depois do fim');
  const [a1, m1] = inicio.split('-').map(Number);
  const [a2, m2] = fim.split('-').map(Number);
  if ((a2 - a1) * 12 + (m2 - m1) + 1 > MAX_MESES_MENSAL) {
    throw new BadRequestException(`O relatório mensal vai até ${MAX_MESES_MENSAL} meses`);
  }
  return { de: inicio, ate: fim };
}

// Linha de produção de um dia ou de um mês, já com a média por vaca em
// lactação (litros produzidos ÷ vacas-dia em lactação)
export function linhaDeProducao(
  paraTanque: number,
  descartado: number,
  vacasDia: number,
) {
  const total = paraTanque + descartado;
  return {
    paraTanque: arredondar(paraTanque),
    descartado: arredondar(descartado),
    total: arredondar(total),
    mediaPorVaca: vacasDia > 0 ? arredondar(total / vacasDia) : null,
  };
}

// Curva da lactação: litros por dia × DEL, com os dias sem ordenha vazios
// para a linha não ligar através deles
export function curvaDaLactacao(
  inicio: string,
  fim: string,
  porDia: Map<string, { litros: number; descarte: boolean }>,
) {
  const dias = diasEntre(inicio, fim);
  const pontos: { data: string; del: number; litros: number | null; descarte: boolean }[] = [];
  for (let del = 0; del <= dias; del++) {
    const data = somarDias(inicio, del);
    const dia = porDia.get(data);
    pontos.push({
      data,
      del,
      litros: dia ? arredondar(dia.litros) : null,
      descarte: dia?.descarte ?? false,
    });
  }
  return pontos;
}
