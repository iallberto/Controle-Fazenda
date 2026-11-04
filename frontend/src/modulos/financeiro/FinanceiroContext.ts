import { createContext, useContext } from 'react';

interface FinanceiroContextType {
  // Módulo desativado: as telas mostram tudo, mas sem lançar (spec 002, FR-011a)
  soConsulta: boolean;
  ehDono: boolean;
}

export const FinanceiroContext = createContext<FinanceiroContextType>({
  soConsulta: false,
  ehDono: false,
});

export function useFinanceiro() {
  return useContext(FinanceiroContext);
}
