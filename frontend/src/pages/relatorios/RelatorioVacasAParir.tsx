import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buscarVacasAParir, type VacaAParir } from '../../api/relatorios';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import {
  formatarBasePrevisao,
  formatarBrinco,
  formatarCategoria,
  formatarData,
  rotuloBrinco,
} from '../../utils/formatadores';

const JANELAS = [7, 15, 30, 60, 90];

// US3: vacas a parir nos próximos dias, com os partos atrasados em destaque (FR-019)
export function RelatorioVacasAParir() {
  const [dias, setDias] = useState(30);
  const [vacas, setVacas] = useState<VacaAParir[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarVacasAParir(dias)
      .then((lista) => {
        setVacas(lista);
        setErro('');
      })
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)))
      .finally(() => setCarregando(false));
  }, [dias]);

  const atrasadas = vacas.filter((vaca) => vaca.atrasado);
  const proximas = vacas.filter((vaca) => !vaca.atrasado);

  return (
    <>
      <div className="filtro-linha">
        <label htmlFor="janela-parto">Parto previsto nos próximos</label>
        <select
          id="janela-parto"
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
          {atrasadas.length > 0 && (
            <section>
              <h2>Parto atrasado ({atrasadas.length})</h2>
              <ListaVacas vacas={atrasadas} />
            </section>
          )}
          <section>
            <h2>Próximos {dias} dias ({proximas.length})</h2>
            {proximas.length === 0 ? <p>Nenhum parto previsto nesse período.</p> : <ListaVacas vacas={proximas} />}
          </section>
          <p className="dica">
            A data sai da inseminação, da idade da prenhez informada no toque ou, sem essas, do meio do
            período em que a vaca ficou com o touro.
          </p>
        </>
      )}
    </>
  );
}

function ListaVacas({ vacas }: { vacas: VacaAParir[] }) {
  return (
    <ul>
      {vacas.map((vaca) => (
        <li key={vaca.animal.id}>
          <strong>{formatarData(vaca.previsaoParto)}</strong> —{' '}
          <Link to={`/animais/${vaca.animal.id}`}>{rotuloBrinco(vaca.animal.brinco)}</Link> ·{' '}
          {formatarCategoria(vaca.animal.categoria)}
          <br />
          <small>
            {formatarBasePrevisao(vaca.base)}
            {vaca.touros.length > 0 && ` · touro ${vaca.touros.map(formatarBrinco).join(' ou ')}`}
            {vaca.semens.length > 0 && ` · sêmen ${vaca.semens.join(' ou ')}`}
            {vaca.pasto && ` · ${vaca.pasto}`}
          </small>
        </li>
      ))}
    </ul>
  );
}
