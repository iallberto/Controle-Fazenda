import { createContext, useContext } from 'react';

interface LeiteContextType {
  soConsulta: boolean;
  ehDono: boolean;
}

export const LeiteContext = createContext<LeiteContextType>({ soConsulta: true, ehDono: false });

export function useLeite() {
  return useContext(LeiteContext);
}
