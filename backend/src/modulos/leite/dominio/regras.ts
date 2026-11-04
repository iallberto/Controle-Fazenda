import { Sexo, VacaDeLeite } from '../../../animal/entities/animal.entity';
import { diasEntre, somarDias } from '../../../reproducao/dominio/datas';

// Regras puras do Leite (spec 004), testadas sem banco.

export const LITROS_MAXIMO_SEM_CONFIRMAR = 80;
const LITROS_MAXIMO_ABSOLUTO = 150;

// Vaca de leite: fêmea marcada SIM, ou PELA_RACA com raça leiteira (FR-004)
export function ehVacaDeLeite(animal: {
  sexo: Sexo;
  vacaDeLeite: VacaDeLeite;
  raca?: { leiteira: boolean } | null;
}): boolean {
  if (animal.sexo !== Sexo.F) return false;
  if (animal.vacaDeLeite === VacaDeLeite.SIM) return true;
  if (animal.vacaDeLeite === VacaDeLeite.NAO) return false;
  return animal.raca?.leiteira === true;
}

// Dias em lactação (FR-007)
export function calcularDel(inicio: string, hoje: string): number {
  return diasEntre(inicio, hoje);
}

// Secagem planejada = parto previsto − prazo (FR-019); sem previsão, nenhuma
export function secagemPlanejada(
  partoPrevisto: string | null,
  prazoSecagemDias: number,
): string | null {
  return partoPrevisto ? somarDias(partoPrevisto, -prazoSecagemDias) : null;
}

// Até quando o leite é descarte no dia: a maior data final entre as carências
// que cobrem o dia (FR-016). null = leite liberado.
export function carenciaAte(
  carencias: { data: string; dataFim: string }[],
  dia: string,
): string | null {
  let ate: string | null = null;
  for (const c of carencias) {
    if (c.data <= dia && dia <= c.dataFim && (!ate || c.dataFim > ate)) {
      ate = c.dataFim;
    }
  }
  return ate;
}

// Turno padrão pela hora local (research R12)
export function turnoPelaHora(hora: number, ordenhasPorDia: number): number {
  if (ordenhasPorDia >= 3 && hora >= 18) return 3;
  if (ordenhasPorDia >= 2 && hora >= 12) return 2;
  return 1;
}

// Litros de uma vaca numa ordenha (FR-011): null quando está certo, ou a
// mensagem do erro
export function validarLitrosDaVaca(
  litros: number,
  confirmarAcima: boolean,
): string | null {
  if (!Number.isFinite(litros) || litros < 0) {
    return 'Litros não podem ser negativos';
  }
  if (Math.round(litros * 10) !== litros * 10) {
    return 'Use no máximo uma casa decimal';
  }
  if (litros > LITROS_MAXIMO_ABSOLUTO) {
    return `Mais de ${LITROS_MAXIMO_ABSOLUTO} litros numa ordenha não é possível`;
  }
  if (litros > LITROS_MAXIMO_SEM_CONFIRMAR && !confirmarAcima) {
    return `Mais de ${LITROS_MAXIMO_SEM_CONFIRMAR} litros: confirme o valor`;
  }
  return null;
}

// Para comparar nomes de produto (sem acento, sem maiúscula)
export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}
