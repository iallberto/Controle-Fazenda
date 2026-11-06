import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Aviso guardado para a tela de login mostrar depois do redirecionamento
export const CHAVE_AVISO_LOGIN = 'avisoLogin';

// Token expirado, usuário desativado ou fazenda suspensa (spec 002, FR-026):
// limpa a sessão e volta para o login. O próprio login fica de fora, porque lá
// o erro já aparece na tela.
apiClient.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehLogin = erro.config?.url?.includes('/auth/login');
    if (axios.isAxiosError(erro) && !ehLogin) {
      const suspensa =
        erro.response?.status === 403 && erro.response.data?.codigo === 'ACESSO_SUSPENSO';
      // Senha provisória ainda não trocada (spec 007, FR-004)
      if (erro.response?.status === 403 && erro.response.data?.codigo === 'SENHA_PROVISORIA') {
        const salvo = localStorage.getItem('usuario');
        if (salvo) localStorage.setItem('usuario', JSON.stringify({ ...JSON.parse(salvo), precisaTrocarSenha: true }));
        if (window.location.pathname !== '/trocar-senha') window.location.assign('/trocar-senha');
        return Promise.reject(erro);
      }
      if (erro.response?.status === 401 || suspensa) {
        const eraSuporte = (() => {
          try {
            return Boolean(JSON.parse(localStorage.getItem('usuario') ?? '{}').suporte);
          } catch {
            return false;
          }
        })();
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        if (suspensa) {
          sessionStorage.setItem(CHAVE_AVISO_LOGIN, erro.response?.data?.message);
        }
        // Sessão de suporte vencida volta ao painel do administrador (spec 008)
        window.location.assign(eraSuporte ? '/admin' : '/login');
      }
    }
    return Promise.reject(erro);
  },
);

export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível carregar os dados.') {
  if (axios.isAxiosError(erro) && erro.response?.data?.message) {
    const mensagem = erro.response.data.message;
    return Array.isArray(mensagem) ? mensagem.join(', ') : mensagem;
  }
  return padrao;
}
