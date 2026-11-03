import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buscarProximosTratamentos, type ProximoTratamento } from '../../api/relatorios';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData, rotuloBrinco } from '../../utils/formatadores';

const JANELAS = [7, 15, 30, 60, 90];

export function RelatorioProximosTratamentos() {
  const [dias, setDias] = useState(30);
  const [itens, setItens] = useState<ProximoTratamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarProximosTratamentos(dias)
      .then((lista) => {
        setItens(lista);
        setErro('');
      })
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)))
      .finally(() => setCarregando(false));
  }, [dias]);

  const atrasados = itens.filter((item) => item.atrasado);
  const proximos = itens.filter((item) => !item.atrasado);

  return (
    <>
      <div className="filtro-linha">
        <label htmlFor="janela">Vencendo nos próximos</label>
        <select
          id="janela"
          value={dias}
          onChange={(e) => {
            setCarregando(true);
            setDias(Number(e.target.value));
          }}
        >
          {JANELAS.map((janela) => (
            <option key={janela} value={janela}>
              {janela} dias
            </option>
          ))}
        </select>
      </div>

      {carregando && <p>Carregando...</p>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {!carregando && !erro && (
        <>
          {atrasados.length > 0 && (
            <section>
              <h2>Atrasados ({atrasados.length})</h2>
              <ListaTratamentos itens={atrasados} />
            </section>
          )}
          <section>
            <h2>Próximos {dias} dias ({proximos.length})</h2>
            {proximos.length === 0 ? (
              <p>Nenhuma dose prevista nesse período.</p>
            ) : (
              <ListaTratamentos itens={proximos} />
            )}
          </section>
          <p className="dica">
            Entram aqui os tratamentos registrados com recorrência. Quando a dose seguinte é
            lançada, a anterior sai da lista.
          </p>
        </>
      )}
    </>
  );
}

function ListaTratamentos({ itens }: { itens: ProximoTratamento[] }) {
  return (
    <ul>
      {itens.map((item) => (
        <li key={item.id}>
          <strong>{formatarData(item.proximaData)}</strong> — {item.produto} —{' '}
          <Link to={`/animais/${item.animal.id}`}>{rotuloBrinco(item.animal.brinco)}</Link>
          <br />
          <small>Última aplicação em {formatarData(item.ultimaAplicacao)}</small>
        </li>
      ))}
    </ul>
  );
}
