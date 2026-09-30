import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { criarTratamento } from '../api/tratamentos';
import { listarAnimais, type Animal } from '../api/animais';

export function NovoTratamento() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');

  const [animalId, setAnimalId] = useState('');
  const [produto, setProduto] = useState('');
  const [data, setData] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [temRecorrencia, setTemRecorrencia] = useState(false);
  const [recorrenciaDias, setRecorrenciaDias] = useState('');

  const [animais, setAnimais] = useState<Animal[]>([]);

  useEffect(() => {
    listarAnimais().then(setAnimais);
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await criarTratamento({
        animalId,
        produto,
        data,
        responsavel,
        recorrenciaDias: temRecorrencia ? Number(recorrenciaDias) : undefined,
      });
      navigate('/animais');
    } catch {
      setErro('Não foi possível registrar o tratamento. Confira os dados.');
    }
  }

  return (
    <div>
      <header>
        <h1>Registrar tratamento</h1>
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
          <label htmlFor="produto">Produto</label>
          <input id="produto" value={produto} onChange={(e) => setProduto(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="data">Data</label>
          <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="responsavel">Responsável</label>
          <input
            id="responsavel"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            required
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={temRecorrencia}
              onChange={(e) => setTemRecorrencia(e.target.checked)}
            />
            Este tratamento se repete periodicamente
          </label>
        </div>

        {temRecorrencia && (
          <div>
            <label htmlFor="recorrencia">A cada quantos dias?</label>
            <input
              id="recorrencia"
              type="number"
              min="1"
              value={recorrenciaDias}
              onChange={(e) => setRecorrenciaDias(e.target.value)}
              required
            />
          </div>
        )}

        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button type="submit">Registrar</button>
      </form>
    </div>
  );
}