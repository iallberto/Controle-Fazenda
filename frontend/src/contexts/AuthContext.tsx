import { createContext, useState, type ReactNode } from 'react';
import { apiClient } from '../api/client';


interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: string;
  fazendaId: string;
  // Senha provisória: só a troca de senha fica liberada (spec 007)
  precisaTrocarSenha?: boolean;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<Usuario>;
  logout: () => void;
  atualizarSessao: (accessToken: string, usuario: Usuario) => void;
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
    atualizarSessao(accessToken, usuarioLogado);
    return usuarioLogado as Usuario;
  }

  // Login e troca de senha devolvem um token novo (spec 007, FR-005)
  function atualizarSessao(accessToken: string, usuarioLogado: Usuario) {
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
    <AuthContext.Provider value={{ usuario, token, login, logout, atualizarSessao }}>
      {children}
    </AuthContext.Provider>
  );
}

