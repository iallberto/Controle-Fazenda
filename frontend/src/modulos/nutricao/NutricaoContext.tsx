import { createContext, useContext } from 'react';

interface NutricaoContextType {
  soConsulta: boolean;
  ehDono: boolean;
}

export const NutricaoContext = createContext<NutricaoContextType>({ soConsulta: true, ehDono: false });

export function useNutricao() {
  return useContext(NutricaoContext);
}
