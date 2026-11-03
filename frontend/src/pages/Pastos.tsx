import { useEffect, useState, type FormEvent } from 'react';
import { listarPastos, criarPasto, type Pasto } from '../api/pastos';
import { Aviso } from '../components/Aviso';

export function Pastos() {
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  function carregar() {
    listarPastos().then(setPastos);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setSucesso('');

    try {
      await criarPasto(nome);
      setSucesso(`Pasto "${nome}" cadastrado.`);
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
      </header>

      <form onSubmit={handleSubmit}>
        <label htmlFor="nome">Novo pasto</label>
        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <button type="submit">Cadastrar</button>
      </form>
      {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <ul>
        {pastos.map((pasto) => (
          <li key={pasto.id}>{pasto.nome}</li>
        ))}
      </ul>
    </div>
  );
}