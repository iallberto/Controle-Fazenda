import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { CHAVE_AVISO_LOGIN, mensagemDeErro } from '../api/client';
import { Logo } from '../components/Logo';
import { Aviso } from '../components/Aviso';

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  // Ex.: fazenda suspensa durante o uso (spec 002, FR-026)
  const [aviso] = useState(() => {
    const texto = sessionStorage.getItem(CHAVE_AVISO_LOGIN);
    sessionStorage.removeItem(CHAVE_AVISO_LOGIN);
    return texto;
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Entrar · Controle Fazenda';
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await login(email, senha);
      navigate('/');
    } catch (erroRequisicao) {
      // Sem resposta do servidor é API fora do ar, não senha errada
      setErro(
        mensagemDeErro(
          erroRequisicao,
          'Não foi possível conectar ao servidor. Verifique se o sistema está no ar e tente de novo.',
        ),
      );
    }
  }

  return (
    <div className="pagina-login">
      <h1 className="login-titulo">
        <Logo tamanho={40} />
        Controle Fazenda
      </h1>
      {aviso && <Aviso tipo="atencao">{aviso}</Aviso>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}