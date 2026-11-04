import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Layout } from './Layout';
import { PreferenciasProvider } from '../contexts/PreferenciasContext';
import { ModulosProvider } from '../contexts/ModulosContext';

export function RotaProtegida() {
  const { token } = useAuth();
  return token ? (
    <PreferenciasProvider>
      <ModulosProvider>
        <Layout />
      </ModulosProvider>
    </PreferenciasProvider>
  ) : (
    <Navigate to="/login" />
  );
}
