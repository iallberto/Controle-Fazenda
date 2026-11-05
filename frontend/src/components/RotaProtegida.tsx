import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Layout } from './Layout';
import { PreferenciasProvider } from '../contexts/PreferenciasContext';
import { ModulosProvider } from '../contexts/ModulosContext';

export function RotaProtegida() {
  const { token, usuario } = useAuth();
  // Senha provisória: nada além da troca de senha (spec 007, FR-004)
  if (token && usuario?.precisaTrocarSenha) return <Navigate to="/trocar-senha" />;
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
