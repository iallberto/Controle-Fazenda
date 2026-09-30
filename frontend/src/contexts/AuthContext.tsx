import { createContext, useState, type ReactNode } from 'react';
import { apiClient } from '../api/client';


interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: string;
  fazendaId: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const salvo = localStorage.getItem('usuario');
    return salvo ? JSON.parse(salvo) : null;
  });

  async function login(email: string, senha: string) {
    const resposta = await apiClient.post('/auth/login', { email, senha });
    const { accessToken, usuario: usuarioLogado } = resposta.data;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
    setToken(accessToken);
    setUsuario(usuarioLogado);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

