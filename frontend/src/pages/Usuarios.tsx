import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listarUsuarios, criarUsuario, type Usuario } from '../api/usuarios';

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [erro, setErro] = useState('');

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<'DONO' | 'FUNCIONARIO'>('FUNCIONARIO');

  function carregar() {
    listarUsuarios().then(setUsuarios);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await criarUsuario({ nome, email, senha, papel });
      setNome('');
      setEmail('');
      setSenha('');
      setPapel('FUNCIONARIO');
      carregar();
    } catch {
      setErro('Não foi possível cadastrar o usuário. O e-mail já pode estar em uso.');
    }
  }

  return (
    <div>
      <header>
        <h1>Usuários</h1>
        <Link to="/">Voltar ao painel</Link>
      </header>

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
        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button type="submit">Cadastrar</button>
      </form>

      <ul>
        {usuarios.map((usuario) => (
          <li key={usuario.id}>
            {usuario.nome} ({usuario.email}) — {usuario.papel}
          </li>
        ))}
      </ul>
    </div>
  );
}