import { formatarData } from '../../utils/formatadores';
import { NOMES_MODULOS, NOMES_SITUACOES, type ModuloDaFazenda } from './api';

const CLASSES = {
  ATIVO: 'selo selo-ativo',
  SO_CONSULTA: 'selo selo-consulta',
  NAO_CONTRATADO: 'selo selo-inativo',
} as const;

// Selo de um módulo de uma fazenda: nome, situação e, se houver, o término
export function SeloModulo({ modulo }: { modulo: ModuloDaFazenda }) {
  return (
    <span className={CLASSES[modulo.situacao]}>
      {NOMES_MODULOS[modulo.modulo]}: {NOMES_SITUACOES[modulo.situacao]}
      {modulo.situacao === 'ATIVO' && modulo.dataTermino && ` até ${formatarData(modulo.dataTermino)}`}
    </span>
  );
}
