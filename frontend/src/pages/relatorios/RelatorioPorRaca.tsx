import { useEffect, useState } from 'react';
import { buscarPorRaca, type LinhaPorRaca } from '../../api/relatorios';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';

export function RelatorioPorRaca() {
  const [linhas, setLinhas] = useState<LinhaPorRaca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarPorRaca()
      .then(setLinhas)
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)))
      .finally(() => setCarregando(false));
  }, []);

  const total = linhas.reduce((soma, linha) => soma + linha.total, 0);

  if (carregando) return <p>Carregando...</p>;
  if (erro) return <Aviso tipo="erro">{erro}</Aviso>;

  return (
    <section>
      <h2>Rebanho ativo por raça ({total})</h2>
      {linhas.length === 0 ? (
        <p>Nenhum animal ativo.</p>
      ) : (
        <div className="tabela-rolavel">
          <table>
            <thead>
              <tr>
                <th>Raça</th>
                <th>Total</th>
                <th>Fêmeas</th>
                <th>Machos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.raca}>
                  <td>{linha.raca}</td>
                  <td>{linha.total}</td>
                  <td>{linha.femeas}</td>
                  <td>{linha.machos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
