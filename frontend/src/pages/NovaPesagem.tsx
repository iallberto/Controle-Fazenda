import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { criarPesagem } from '../api/pesagens';
import { listarAnimais, type Animal } from '../api/animais';

export function NovaPesagem() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');

  const [animalId, setAnimalId] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [data, setData] = useState('');
  const [observacao, setObservacao] = useState('');

  const [animais, setAnimais] = useState<Animal[]>([]);

  useEffect(() => {
    listarAnimais().then(setAnimais);
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await criarPesagem({
        animalId,
        pesoKg: Number(pesoKg),
        data,
        observacao: observacao || undefined,
      });
      navigate(`/animais/${animalId}`);
    } catch (erroRequisicao) {
      const mensagem =
        axios.isAxiosError(erroRequisicao) && erroRequisicao.response?.data?.message
          ? erroRequisicao.response.data.message
          : 'Não foi possível registrar a pesagem.';
      setErro(Array.isArray(mensagem) ? mensagem.join(', ') : mensagem);
    }
  }

  return (
    <div>
      <header>
        <h1>Registrar pesagem</h1>
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
          <label htmlFor="pesoKg">Peso (kg)</label>
          <input
            id="pesoKg"
            type="number"
            step="0.1"
            min="0"
            value={pesoKg}
            onChange={(e) => setPesoKg(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="data">Data</label>
          <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="observacao">Observação</label>
          <textarea id="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>

        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button type="submit">Registrar</button>
      </form>
    </div>
  );
}