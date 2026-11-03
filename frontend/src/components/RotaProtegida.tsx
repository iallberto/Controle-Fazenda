import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Layout } from './Layout';

export function RotaProtegida() {
  const { token } = useAuth();
  return token ? <Layout /> : <Navigate to="/login" />;
}
