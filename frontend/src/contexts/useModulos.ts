import { useContext } from 'react';
import { ModulosContext } from './ModulosContext';

export function useModulos() {
  const contexto = useContext(ModulosContext);
  if (!contexto) {
    throw new Error('useModulos precisa estar dentro de ModulosProvider');
  }
  return contexto;
}
