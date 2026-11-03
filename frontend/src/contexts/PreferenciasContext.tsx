import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { obterConfiguracao } from '../api/configuracao';
import type { NomeSom } from '../utils/sons';

interface PreferenciasContextType {
  somAtivo: boolean;
  som: NomeSom;
  recarregar: () => Promise<void>;
}

// Preferências da fazenda usadas em várias telas (por enquanto, o som dos avisos).
// Só existe dentro do sistema logado; fora dele (login, página pública) fica undefined.
// eslint-disable-next-line react-refresh/only-export-components
export const PreferenciasContext = createContext<PreferenciasContextType | undefined>(undefined);

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [somAtivo, setSomAtivo] = useState(false);
  const [som, setSom] = useState<NomeSom>('SINO');

  const recarregar = useCallback(() => {
    return obterConfiguracao()
      .then((config) => {
        setSomAtivo(config.somAtivo);
        setSom(config.som);
      })
      .catch(() => {
        // Sem as preferências, os avisos só não tocam som
      });
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return (
    <PreferenciasContext.Provider value={{ somAtivo, som, recarregar }}>
      {children}
    </PreferenciasContext.Provider>
  );
}
