import {
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
  StatusReprodutivo,
} from '../../animal/entities/animal.entity';
import { diasEntre, somarDias, formatarDataBr } from './datas';

// Descanso mínimo depois do parto antes de voltar à cobertura (clarificação de 2026-11-03)
export const DIAS_DESCANSO_POS_PARTO = 45;

const CATEGORIAS_DE_COBERTURA = [
  CategoriaAnimal.MATRIZ,
  CategoriaAnimal.NOVILHA,
];

export interface FemeaParaAptidao {
  status: StatusAnimal;
  sexo: Sexo;
  categoria: CategoriaAnimal;
  statusReprodutivo: StatusReprodutivo | null;
}

// Por que a fêmea não pode entrar em cobertura hoje; null quando está apta (FR-003)
export function motivoInaptidao(
  femea: FemeaParaAptidao,
  dataUltimoParto: string | null,
  hoje: string,
): string | null {
  if (femea.status !== StatusAnimal.ATIVO) return 'não está mais no rebanho';
  if (femea.sexo !== Sexo.F) return 'não é fêmea';
  if (!CATEGORIAS_DE_COBERTURA.includes(femea.categoria)) {
    return 'só matrizes e novilhas entram em cobertura';
  }
  if (femea.statusReprodutivo === StatusReprodutivo.PRENHE)
    return 'já está prenhe';
  if (
    dataUltimoParto &&
    diasEntre(dataUltimoParto, hoje) < DIAS_DESCANSO_POS_PARTO
  ) {
    const aptaEm = somarDias(dataUltimoParto, DIAS_DESCANSO_POS_PARTO);
    return `pariu há menos de ${DIAS_DESCANSO_POS_PARTO} dias (apta a partir de ${formatarDataBr(aptaEm)})`;
  }
  return null;
}

export function estaApta(
  femea: FemeaParaAptidao,
  dataUltimoParto: string | null,
  hoje: string,
) {
  return motivoInaptidao(femea, dataUltimoParto, hoje) === null;
}
