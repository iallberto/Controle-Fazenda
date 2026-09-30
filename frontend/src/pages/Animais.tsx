import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarAnimais, type Animal } from '../api/animais';

export function Animais() {
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    listarAnimais()
      .then(setAnimais)
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div>
      <header>
        <h1>Animais</h1>
        <Link to="/animais/novo">Cadastrar animal</Link>
        <Link to="/partos/novo">Registrar parto</Link>
        <Link to="/tratamentos/novo">Registrar tratamento</Link>
        <Link to="/animais/mover">Mover animal</Link>
        <Link to="/">Voltar ao painel</Link>
      </header>

      {carregando && <p>Carregando...</p>}

      {!carregando && animais.length === 0 && <p>Nenhum animal cadastrado ainda.</p>}

      {animais.length > 0 && (
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
                <td>{animal.brinco}</td>
                <td>{animal.sexo}</td>
                <td>{animal.categoria}</td>
                <td>{animal.status}</td>
                <td>{animal.dataNascimento}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}