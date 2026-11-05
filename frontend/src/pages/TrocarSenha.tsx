import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiClient, mensagemDeErro } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { Logo } from '../components/Logo';
import { Aviso } from '../components/Aviso';

// Troca da própria senha (spec 007, FR-001). Com a senha provisória, esta é a
// única tela liberada até o usuário criar uma senha nova (FR-004). Os campos
// usam autoComplete para o navegador atualizar a senha salva (FR-024).
export function TrocarSenha() {
  const { token, usuario, atualizarSessao, logout } = useAuth();
  const navigate = useNavigate();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [repetida, setRepetida] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const obrigatoria = Boolean(usuario?.precisaTrocarSenha);

  useEffect(() => {
    document.title = 'Trocar senha · Controle Fazenda';
  }, []);

  if (!token) return <Navigate to="/login" />;

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    if (novaSenha.length < 8) {
      setErro('A senha nova precisa ter 8 caracteres ou mais.');
      return;
    }
    if (novaSenha !== repetida) {
      setErro('As duas senhas novas não conferem.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await apiClient.post('/auth/trocar-senha', { senhaAtual, novaSenha });
      atualizarSessao(resposta.data.accessToken, resposta.data.usuario);
      navigate('/', { state: { aviso: 'Senha trocada.' } });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível trocar a senha.'));
      setSalvando(false);
    }
  }

  return (
    <div className="pagina-login">
      <h1 className="login-titulo">
        <Logo tamanho={40} />
        {obrigatoria ? 'Crie sua senha' : 'Trocar senha'}
      </h1>
      {obrigatoria && (
        <Aviso tipo="atencao">
          Você entrou com uma senha provisória. Crie uma senha nova para continuar.
        </Aviso>
      )}
      <form onSubmit={salvar}>
        {/* O e-mail escondido ajuda o gerenciador de senhas a saber de qual conta é a senha nova */}
        <input type="email" name="username" autoComplete="username" value={usuario?.email ?? ''} readOnly hidden />
        <div>
          <label htmlFor="senha-atual">{obrigatoria ? 'Senha provisória' : 'Senha atual'}</label>
          <input
            id="senha-atual"
            name="senha-atual"
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="nova-senha">Senha nova (8 caracteres ou mais)</label>
          <input
            id="nova-senha"
            name="nova-senha"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="repetir-senha">Repita a senha nova</label>
          <input
            id="repetir-senha"
            name="repetir-senha"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            required
          />
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar senha nova'}
        </button>
      </form>
      {obrigatoria ? (
        <button type="button" className="botao-secundario" onClick={logout}>
          Sair
        </button>
      ) : (
        <Link to="/">Voltar</Link>
      )}
    </div>
  );
}
