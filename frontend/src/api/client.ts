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

// Token expirado ou usuário desativado: limpa a sessão e volta para o login.
// O próprio login fica de fora, porque lá o 401 é só senha errada.
apiClient.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehLogin = erro.config?.url?.includes('/auth/login');
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !ehLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.assign('/login');
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
