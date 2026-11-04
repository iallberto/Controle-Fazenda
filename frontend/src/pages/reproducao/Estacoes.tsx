import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarEstacoes, type EstacaoResumo } from '../../api/reproducao';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData, formatarMotivoEncerramento, rotuloBrinco } from '../../utils/formatadores';

// US1: estações de monta natural (um touro num pasto por um período)
export function Estacoes() {
  const [estacoes, setEstacoes] = useState<EstacaoResumo[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarEstacoes()
      .then(setEstacoes)
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }, []);

  const abertas = estacoes?.filter((estacao) => !estacao.dataSaida) ?? [];
  const encerradas = estacoes?.filter((estacao) => estacao.dataSaida) ?? [];

  return (
    <div>
      <header>
        <h1>Estações de monta</h1>
        <Link to="/reproducao/estacoes/nova">Nova estação</Link>
      </header>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!estacoes && !erro && <p>Carregando...</p>}

      {estacoes && (
        <>
          <section>
            <h2>Abertas ({abertas.length})</h2>
            {abertas.length === 0 ? (
              <p>Nenhum touro em estação agora.</p>
            ) : (
              <ListaEstacoes estacoes={abertas} />
            )}
          </section>
          {encerradas.length > 0 && (
            <section>
              <h2>Encerradas ({encerradas.length})</h2>
              <ListaEstacoes estacoes={encerradas} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ListaEstacoes({ estacoes }: { estacoes: EstacaoResumo[] }) {
  return (
    <ul>
      {estacoes.map((estacao) => (
        <li key={estacao.id}>
          <Link to={`/reproducao/estacoes/${estacao.id}`}>
            {rotuloBrinco(estacao.touro.brinco)} no {estacao.pasto.nome}
          </Link>
          <br />
          <small>
            {estacao.dataSaida
              ? `${formatarData(estacao.dataEntrada)} a ${formatarData(estacao.dataSaida)} · ${formatarMotivoEncerramento(estacao.motivoEncerramento)}`
              : `Desde ${formatarData(estacao.dataEntrada)}`}
            {' · '}
            {estacao.expostas === 1 ? '1 fêmea' : `${estacao.expostas} fêmeas`}
          </small>
        </li>
      ))}
    </ul>
  );
}
