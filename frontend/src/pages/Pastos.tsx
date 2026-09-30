import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listarPastos, criarPasto, type Pasto } from '../api/pastos';

export function Pastos() {
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');

  function carregar() {
    listarPastos().then(setPastos);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await criarPasto(nome);
      setNome('');
      carregar();
    } catch {
      setErro('Não foi possível cadastrar o pasto. O nome já pode estar em uso.');
    }
  }

  return (
    <div>
      <header>
        <h1>Pastos</h1>
        <Link to="/">Voltar ao painel</Link>
      </header>

      <form onSubmit={handleSubmit}>
        <label htmlFor="nome">Novo pasto</label>
        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <button type="submit">Cadastrar</button>
        {erro && <p style={{ color: 'red' }}>{erro}</p>}
      </form>

      <ul>
        {pastos.map((pasto) => (
          <li key={pasto.id}>{pasto.nome}</li>
        ))}
      </ul>
    </div>
  );
}