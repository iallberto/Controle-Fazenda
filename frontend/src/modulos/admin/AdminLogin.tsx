import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { Logo } from '../../components/Logo';
import { entrarNoPainel } from './api';

// Login do administrador do sistema, separado do login das fazendas (FR-018).
// Depois de 5 erros seguidos o servidor bloqueia por 15 minutos (FR-018a).
export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Painel do administrador · Controle Fazenda';
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrarNoPainel(email, senha);
      navigate('/admin');
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível conectar ao servidor.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-login">
      <h1 className="login-titulo">
        <Logo tamanho={40} />
        Painel do administrador
      </h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email-admin">E-mail</label>
          <input
            id="email-admin"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="senha-admin">Senha</label>
          <input
            id="senha-admin"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
