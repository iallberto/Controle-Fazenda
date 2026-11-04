import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { buscarModulos, type ModuloDaFazenda, type ModuloPago } from '../api/modulos';

interface ModulosContextType {
  // null enquanto carrega
  modulos: ModuloDaFazenda[] | null;
  situacaoDe: (modulo: ModuloPago) => ModuloDaFazenda | undefined;
  recarregar: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ModulosContext = createContext<ModulosContextType | undefined>(undefined);

// Situação dos módulos pagos da fazenda logada, para o menu, a vitrine e o aviso
// de vencimento (spec 002, R10). A proteção real está no backend: isto só
// decide o que mostrar.
export function ModulosProvider({ children }: { children: ReactNode }) {
  const [modulos, setModulos] = useState<ModuloDaFazenda[] | null>(null);

  const recarregar = useCallback(() => {
    buscarModulos()
      .then(setModulos)
      // Sem a lista, o menu mostra todos como vitrine; o backend continua bloqueando
      .catch(() => setModulos([]));
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const situacaoDe = useCallback(
    (modulo: ModuloPago) => modulos?.find((item) => item.modulo === modulo),
    [modulos],
  );

  return (
    <ModulosContext.Provider value={{ modulos, situacaoDe, recarregar }}>
      {children}
    </ModulosContext.Provider>
  );
}
