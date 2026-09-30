import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

export function RotaProtegida() {
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" />;
}