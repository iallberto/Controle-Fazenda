import axios from 'axios';

// Cliente só do painel do administrador (spec 002, R12). Token próprio, em
// outra chave: o token de fazenda nunca vai para o painel, e vice-versa.
export const CHAVE_TOKEN_ADMIN = 'adminToken';
export const CHAVE_ADMIN = 'admin';

export const adminClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(CHAVE_TOKEN_ADMIN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão do administrador vencida: volta ao login do painel
adminClient.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehLogin = erro.config?.url?.includes('/admin/auth/login');
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !ehLogin) {
      sairDoPainel();
      window.location.assign('/admin/login');
    }
    return Promise.reject(erro);
  },
);

export type ModuloPago = 'LEITE' | 'FINANCEIRO' | 'NUTRICAO';
export type SituacaoModulo = 'ATIVO' | 'SO_CONSULTA' | 'NAO_CONTRATADO';

export interface ModuloDaFazenda {
  modulo: ModuloPago;
  situacao: SituacaoModulo;
  dataTermino: string | null;
  diasParaVencer: number | null;
}

export interface FazendaCliente {
  id: string;
  nome: string;
  criadaEm: string;
  usuariosAtivos: number;
  suspensa: boolean;
  modulos: ModuloDaFazenda[];
}

export interface FazendaClienteDetalhe extends FazendaCliente {
  periodos: {
    id: string;
    modulo: ModuloPago;
    dataInicio: string;
    dataTermino: string | null;
    liberadoPor: string | null;
    liberadoEm: string;
    desativadoPor: string | null;
    desativadoEm: string | null;
  }[];
  suspensoes: {
    id: string;
    motivo: string;
    suspensaPor: string | null;
    suspensaEm: string;
    reativadaPor: string | null;
    reativadaEm: string | null;
  }[];
}

export interface Administrador {
  id: string;
  nome: string;
  email: string;
}

export function administradorLogado(): Administrador | null {
  try {
    const salvo = localStorage.getItem(CHAVE_ADMIN);
    return salvo && localStorage.getItem(CHAVE_TOKEN_ADMIN) ? JSON.parse(salvo) : null;
  } catch {
    return null;
  }
}

export async function entrarNoPainel(email: string, senha: string) {
  const resposta = await adminClient.post<{ accessToken: string; administrador: Administrador }>(
    '/admin/auth/login',
    { email, senha },
  );
  localStorage.setItem(CHAVE_TOKEN_ADMIN, resposta.data.accessToken);
  localStorage.setItem(CHAVE_ADMIN, JSON.stringify(resposta.data.administrador));
  return resposta.data.administrador;
}

export function sairDoPainel() {
  localStorage.removeItem(CHAVE_TOKEN_ADMIN);
  localStorage.removeItem(CHAVE_ADMIN);
}

export async function listarFazendasClientes(busca?: string) {
  const resposta = await adminClient.get<FazendaCliente[]>('/admin/fazendas', {
    params: { busca: busca || undefined },
  });
  return resposta.data;
}

export async function buscarFazendaCliente(id: string) {
  const resposta = await adminClient.get<FazendaClienteDetalhe>(`/admin/fazendas/${id}`);
  return resposta.data;
}

export async function liberarModulo(
  fazendaId: string,
  dados: { modulo: ModuloPago; dataInicio: string; dataTermino?: string },
) {
  await adminClient.post(`/admin/fazendas/${fazendaId}/modulos`, dados);
}

export async function desativarModulo(periodoId: string) {
  await adminClient.post(`/admin/modulos/${periodoId}/desativar`);
}

export async function suspenderFazenda(fazendaId: string, motivo: string) {
  await adminClient.post(`/admin/fazendas/${fazendaId}/suspender`, { motivo });
}

export async function reativarFazenda(fazendaId: string) {
  await adminClient.post(`/admin/fazendas/${fazendaId}/reativar`);
}

export const NOMES_MODULOS: Record<ModuloPago, string> = {
  LEITE: 'Leite',
  FINANCEIRO: 'Financeiro',
  NUTRICAO: 'Nutrição',
};

export const NOMES_SITUACOES: Record<SituacaoModulo, string> = {
  ATIVO: 'Ativo',
  SO_CONSULTA: 'Só consulta',
  NAO_CONTRATADO: 'Não contratado',
};
