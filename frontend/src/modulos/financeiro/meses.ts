import { hojeLocal } from '../../utils/datas';

const NOMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

// Mês corrente no formato AAAA-MM, pelo fuso local
export function mesAtual() {
  return hojeLocal().slice(0, 7);
}

// "2026-11" → "Novembro de 2026"
export function nomeDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  const nome = NOMES[m - 1];
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

// "2026-11" → "nov/26", para gráficos e tabelas
export function nomeCurtoDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  return `${NOMES[m - 1].slice(0, 3)}/${String(ano).slice(2)}`;
}

// Soma meses a "AAAA-MM" (negativo volta)
export function somarMeses(mes: string, quantidade: number) {
  const [ano, m] = mes.split('-').map(Number);
  const total = ano * 12 + (m - 1) + quantidade;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}
