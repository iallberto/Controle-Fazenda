import { useContext } from 'react';
import { PreferenciasContext } from './PreferenciasContext';

// Diferente do useAuth, não exige o provider: fora do sistema logado devolve undefined
export function usePreferencias() {
  return useContext(PreferenciasContext);
}
