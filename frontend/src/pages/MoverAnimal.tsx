import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { moverAnimal } from '../api/movimentacoes';
import { listarAnimais, type Animal } from '../api/animais';
import { listarPastos, type Pasto } from '../api/pastos';

export function MoverAnimal() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');

  const [animalId, setAnimalId] = useState('');
  const [pastoId, setPastoId] = useState('');
  const [data, setData] = useState('');

  const [animais, setAnimais] = useState<Animal[]>([]);
  const [pastos, setPastos] = useState<Pasto[]>([]);

  useEffect(() => {
    listarAnimais().then(setAnimais);
    listarPastos().then(setPastos);
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await moverAnimal({ animalId, pastoId, data: data || undefined });
      navigate('/animais');
    } catch {
      setErro('Não foi possível mover o animal.');
    }
  }

  return (
    <div>
      <header>
        <h1>Mover animal de pasto</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="animal">Animal</label>
          <select id="animal" value={animalId} onChange={(e) => setAnimalId(e.target.value)} required>
            <option value="">Selecione o animal</option>
            {animais.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.brinco}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pasto">Novo pasto</label>
          <select id="pasto" value={pastoId} onChange={(e) => setPastoId(e.target.value)} required>
            <option value="">Selecione o pasto</option>
            {pastos.map((pasto) => (
              <option key={pasto.id} value={pasto.id}>
                {pasto.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="data">Data (deixe em branco para hoje)</label>
          <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>

        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button type="submit">Mover</button>
      </form>
    </div>
  );
}