import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Layout } from './Layout';
import { PreferenciasProvider } from '../contexts/PreferenciasContext';

export function RotaProtegida() {
  const { token } = useAuth();
  return token ? (
    <PreferenciasProvider>
      <Layout />
    </PreferenciasProvider>
  ) : (
    <Navigate to="/login" />
  );
}
