import { apiClient } from './client';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: 'DONO' | 'FUNCIONARIO';
  ativo: boolean;
}

export interface CriarUsuarioDto {
  nome: string;
  email: string;
  senha: string;
  papel: 'DONO' | 'FUNCIONARIO';
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const resposta = await apiClient.get<Usuario[]>('/usuario');
  return resposta.data;
}

export interface Aplicador {
  id: string;
  nome: string;
  papel: 'DONO' | 'FUNCIONARIO';
}

// Usuários ativos da fazenda, para escolher quem aplicou um tratamento (qualquer papel)
export async function listarAplicadores(): Promise<Aplicador[]> {
  const resposta = await apiClient.get<Aplicador[]>('/usuario/aplicadores');
  return resposta.data;
}

export async function criarUsuario(dto: CriarUsuarioDto) {
  const resposta = await apiClient.post('/usuario', dto);
  return resposta.data;
}

export async function alterarAtivoUsuario(id: string, ativo: boolean): Promise<Usuario> {
  const acao = ativo ? 'reativar' : 'desativar';
  const resposta = await apiClient.patch<Usuario>(`/usuario/${id}/${acao}`);
  return resposta.data;
}
