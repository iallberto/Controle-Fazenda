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
  // Acesso de suporte aberto pelo painel do administrador (spec 008)
  suporte?: boolean;
  fazendaNome?: string;
  fazendaSuspensa?: boolean;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  login: (email: string, senha: string) => Promise<Usuario>;
  logout: () => void;
  atualizarSessao: (accessToken: string, usuario: Usuario) => void;
  sairDoSuporte: () => Promise<void>;
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

  // "Sair" do acesso de suporte: grava a saída e volta ao painel (spec 008)
  async function sairDoSuporte() {
    try {
      await apiClient.post('/auth/encerrar-suporte');
    } catch {
      // Sessão já vencida: só limpa e volta ao painel
    }
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.assign('/admin');
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, atualizarSessao, sairDoSuporte }}>
      {children}
    </AuthContext.Provider>
  );
}

