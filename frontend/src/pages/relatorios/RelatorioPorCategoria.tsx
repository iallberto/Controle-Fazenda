import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarAnimais, type Animal } from '../../api/animais';
import { buscarPainelInicial } from '../../api/relatorios';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import {
  ROTULOS_CATEGORIA,
  formatarBrinco,
  formatarCategoria,
  formatarIdade,
  formatarSexo,
  type Categoria,
} from '../../utils/formatadores';

export function RelatorioPorCategoria() {
  const [totais, setTotais] = useState<Record<string, number>>({});
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarPainelInicial()
      .then((painel) =>
        setTotais(
          Object.fromEntries(painel.porCategoria.map((linha) => [linha.categoria, Number(linha.total)])),
        ),
      )
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }, []);

  function handleEscolher(nova: Categoria) {
    setCategoria(nova);
    listarAnimais(nova)
      .then((lista) => setAnimais(lista.filter((animal) => animal.status === 'ATIVO')))
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }

  return (
    <>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <section>
        <h2>Animais ativos por categoria</h2>
        <div className="tabela-rolavel">
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ROTULOS_CATEGORIA) as Categoria[]).map((item) => (
                <tr key={item}>
                  <td>{formatarCategoria(item)}</td>
                  <td>{totais[item] ?? 0}</td>
                  <td>
                    <button type="button" className="botao-link" onClick={() => handleEscolher(item)}>
                      Ver animais
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {categoria && (
        <section>
          <h2>
            {formatarCategoria(categoria)} ({animais.length})
          </h2>
          {animais.length === 0 ? (
            <p>Nenhum animal ativo nesta categoria.</p>
          ) : (
            <ul>
              {animais.map((animal) => (
                <li key={animal.id}>
                  <Link to={`/animais/${animal.id}`}>{formatarBrinco(animal.brinco)}</Link> ·{' '}
                  {formatarSexo(animal.sexo)} · {formatarIdade(animal.dataNascimento)}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
