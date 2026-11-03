import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarAnimais, type Animal } from '../api/animais';
import { mensagemDeErro } from '../api/client';
import { formatarBrinco, formatarCategoria, formatarData, formatarSexo, formatarStatusAnimal } from '../utils/formatadores';
import { Aviso } from '../components/Aviso';

export function Animais() {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarAnimais()
      .then(setAnimais)
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div>
      <header>
        <h1>Animais</h1>
        <Link to="/animais/novo">Cadastrar animal</Link>
      </header>

      {carregando && <p>Carregando...</p>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {!carregando && !erro && animais.length === 0 && <p>Nenhum animal cadastrado ainda.</p>}

      {animais.length > 0 && (
        <div className="tabela-rolavel">
          <table>
            <thead>
              <tr>
                <th>Brinco</th>
                <th>Sexo</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Nascimento</th>
              </tr>
            </thead>
            <tbody>
              {animais.map((animal) => (
                <tr key={animal.id}>
                  <td>
                    <Link to={`/animais/${animal.id}`}>{formatarBrinco(animal.brinco)}</Link>
                  </td>
                  <td>{formatarSexo(animal.sexo)}</td>
                  <td>{formatarCategoria(animal.categoria)}</td>
                  <td>{formatarStatusAnimal(animal.status)}</td>
                  <td>{formatarData(animal.dataNascimento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}