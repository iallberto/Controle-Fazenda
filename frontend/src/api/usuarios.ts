import { apiClient } from './client';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: 'DONO' | 'FUNCIONARIO';
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

export async function criarUsuario(dto: CriarUsuarioDto) {
  const resposta = await apiClient.post('/usuario', dto);
  return resposta.data;
}