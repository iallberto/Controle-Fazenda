import { useEffect, useState, type FormEvent } from 'react';
import {
  listarUsuarios,
  criarUsuario,
  alterarAtivoUsuario,
  redefinirSenhaUsuario,
  type Usuario,
} from '../api/usuarios';
import { mensagemDeErro } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { formatarPapel } from '../utils/formatadores';
import { Aviso } from '../components/Aviso';
import { SenhaProvisoria } from '../components/SenhaProvisoria';

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [provisoria, setProvisoria] = useState<{ para: string; senha: string } | null>(null);
  const { usuario: usuarioLogado } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [papel, setPapel] = useState<'DONO' | 'FUNCIONARIO'>('FUNCIONARIO');

  function carregar() {
    listarUsuarios()
      .then(setUsuarios)
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setSucesso('');

    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirmacaoSenha) {
      setErro('As senhas não conferem. Digite a mesma senha nos dois campos.');
      return;
    }

    try {
      await criarUsuario({ nome, email, senha, papel });
      setSucesso(`Usuário ${nome} cadastrado.`);
      setNome('');
      setEmail('');
      setSenha('');
      setConfirmacaoSenha('');
      setPapel('FUNCIONARIO');
      carregar();
    } catch {
      setErro('Não foi possível cadastrar o usuário. O e-mail já pode estar em uso.');
    }
  }

  async function handleAlterarAtivo(usuario: Usuario) {
    setErro('');
    setSucesso('');
    try {
      await alterarAtivoUsuario(usuario.id, !usuario.ativo);
      setSucesso(`Usuário ${usuario.nome} ${usuario.ativo ? 'desativado' : 'reativado'}.`);
      carregar();
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível alterar o usuário.'));
    }
  }

  async function handleRedefinirSenha(usuario: Usuario) {
    setErro('');
    setSucesso('');
    if (!window.confirm(`Redefinir a senha de ${usuario.nome}? A senha atual dele deixa de funcionar.`)) return;
    try {
      const { senhaProvisoria } = await redefinirSenhaUsuario(usuario.id);
      setProvisoria({ para: usuario.nome, senha: senhaProvisoria });
      // O aviso fica no topo e o botão no fim da lista
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível redefinir a senha.'));
    }
  }

  return (
    <div>
      <header>
        <h1>Usuários</h1>
      </header>

      {provisoria && (
        <SenhaProvisoria para={provisoria.para} senha={provisoria.senha} aoFechar={() => setProvisoria(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="nome">Nome</label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
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
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <label htmlFor="confirmacao-senha">Confirmar senha</label>
          <input
            id="confirmacao-senha"
            type="password"
            value={confirmacaoSenha}
            onChange={(e) => setConfirmacaoSenha(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <label htmlFor="papel">Papel</label>
          <select id="papel" value={papel} onChange={(e) => setPapel(e.target.value as typeof papel)}>
            <option value="FUNCIONARIO">Funcionário</option>
            <option value="DONO">Dono</option>
          </select>
        </div>
        {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit">Cadastrar</button>
      </form>

      <ul>
        {usuarios.map((usuario) => (
          <li key={usuario.id}>
            {usuario.nome} ({usuario.email}) — {formatarPapel(usuario.papel)}
            {!usuario.ativo && ' (desativado)'}{' '}
            {usuario.id !== usuarioLogado?.id && (
              <button type="button" onClick={() => handleAlterarAtivo(usuario)}>
                {usuario.ativo ? 'Desativar' : 'Reativar'}
              </button>
            )}{' '}
            {usuario.ativo && usuario.papel === 'FUNCIONARIO' && (
              <button type="button" className="botao-secundario" onClick={() => handleRedefinirSenha(usuario)}>
                Redefinir senha
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}