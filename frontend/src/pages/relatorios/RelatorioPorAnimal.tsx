import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarAnimais, type Animal } from '../../api/animais';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarCategoria, rotuloBrinco } from '../../utils/formatadores';

// A página do animal já reúne todo o histórico (pesagens, tratamentos, partos,
// brincos); este relatório só ajuda a encontrar o animal e abre a página dele.
export function RelatorioPorAnimal() {
  const navigate = useNavigate();
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [animalId, setAnimalId] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarAnimais()
      .then(setAnimais)
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }, []);

  function handleAbrir(evento: FormEvent) {
    evento.preventDefault();
    navigate(`/animais/${animalId}`);
  }

  return (
    <>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <form onSubmit={handleAbrir}>
        <div>
          <label htmlFor="animal">Animal</label>
          <select id="animal" value={animalId} onChange={(e) => setAnimalId(e.target.value)} required>
            <option value="">Selecione o animal</option>
            {animais.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {rotuloBrinco(animal.brinco)} · {formatarCategoria(animal.categoria)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Ver histórico do animal</button>
      </form>
    </>
  );
}
