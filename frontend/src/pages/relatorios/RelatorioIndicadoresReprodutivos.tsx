import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buscarIndicadoresReprodutivos,
  type IndicadoresReprodutivos,
  type TaxaPrenhez,
} from '../../api/relatorios';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData, rotuloBrinco } from '../../utils/formatadores';

// Sem nenhuma diagnosticada não há taxa: o detalhe embaixo já diz "sem diagnóstico"
function Taxa({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="taxa-vazia">—</span>;
  return <strong className="taxa">{Math.round(valor * 100)}%</strong>;
}

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

// "2 prenhes · 1 vazia · 1 sem diagnóstico · 1 saiu do rebanho"
function detalheTaxa(t: TaxaPrenhez) {
  const partes = [plural(t.prenhes, 'prenhe', 'prenhes'), plural(t.vazias, 'vazia', 'vazias')];
  if (t.semDiagnostico > 0) partes.push(`${t.semDiagnostico} sem diagnóstico`);
  if (t.sairam > 0) partes.push(`${t.sairam} ${t.sairam === 1 ? 'saiu' : 'saíram'} do rebanho`);
  return partes.join(' · ');
}

function formatarIntervalo(dias: number) {
  return `${dias} dias (${(dias / 30.4).toFixed(1).replace('.', ',')} meses)`;
}

// US6: taxa de prenhez por estação, touro e sêmen e intervalo entre partos (FR-028, FR-029)
export function RelatorioIndicadoresReprodutivos() {
  const [dados, setDados] = useState<IndicadoresReprodutivos | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarIndicadoresReprodutivos()
      .then(setDados)
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }, []);

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>;
  if (!dados) return <p>Carregando...</p>;

  const { estacoes, touros, semens, intervaloPartos } = dados;

  return (
    <>
      <section>
        <h2>Taxa de prenhez por estação</h2>
        {estacoes.length === 0 ? (
          <p>Nenhuma estação de monta registrada.</p>
        ) : (
          <ul className="lista-indicadores">
            {estacoes.map((estacao) => (
              <li key={estacao.id}>
                <div className="indicador-cabecalho">
                  <Link to={`/reproducao/estacoes/${estacao.id}`}>
                    Touro {estacao.touro.brinco ? rotuloBrinco(estacao.touro.brinco) : '—'}
                    {estacao.pasto && ` no ${estacao.pasto}`}
                  </Link>
                  <Taxa valor={estacao.taxa} />
                </div>
                <small>
                  {formatarData(estacao.dataEntrada)}
                  {estacao.dataSaida ? ` a ${formatarData(estacao.dataSaida)}` : ' · aberta'} ·{' '}
                  {plural(estacao.cobertas, 'fêmea exposta', 'fêmeas expostas')}
                  <br />
                  {detalheTaxa(estacao)}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {touros.some((touro) => touro.estacoes > 1) && (
        <section>
          <h2>Por touro (todas as estações)</h2>
          <ul className="lista-indicadores">
            {touros.map((item) => (
              <li key={item.touro.id}>
                <div className="indicador-cabecalho">
                  <span>
                    Touro {item.touro.brinco ? rotuloBrinco(item.touro.brinco) : '—'} ·{' '}
                    {plural(item.estacoes, 'estação', 'estações')}
                  </span>
                  <Taxa valor={item.taxa} />
                </div>
                <small>{detalheTaxa(item)}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      {semens.length > 0 && (
        <section>
          <h2>Taxa de prenhez por sêmen</h2>
          <ul className="lista-indicadores">
            {semens.map((item) => (
              <li key={item.semen.id}>
                <div className="indicador-cabecalho">
                  <span>
                    {item.semen.nomeTouro ?? 'Sêmen'} · {plural(item.cobertas, 'inseminada', 'inseminadas')}
                  </span>
                  <Taxa valor={item.taxa} />
                </div>
                <small>{detalheTaxa(item)}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Intervalo entre partos</h2>
        {intervaloPartos.mediaRebanhoDias === null ? (
          <p>Nenhuma matriz ativa com dois partos ou mais.</p>
        ) : (
          <>
            <p>
              Média do rebanho: <strong>{formatarIntervalo(intervaloPartos.mediaRebanhoDias)}</strong>
            </p>
            <ul className="lista-indicadores">
              {intervaloPartos.porMatriz.map((item) => (
                <li key={item.animal.id}>
                  <div className="indicador-cabecalho">
                    <Link to={`/animais/${item.animal.id}`}>{rotuloBrinco(item.animal.brinco)}</Link>
                    <strong>{item.ultimoIntervaloDias} dias</strong>
                  </div>
                  <small>
                    último intervalo · {plural(item.partos, 'parto', 'partos')}
                    {item.partos > 2 && ` · média dela: ${item.mediaDias} dias`}
                  </small>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="dica">
        A taxa é prenhes ÷ (prenhes + vazias). Vale o primeiro diagnóstico depois da entrada na estação (ou da
        inseminação) e em até 300 dias. Quem ainda não foi diagnosticada ou saiu do rebanho antes fica fora da
        conta e aparece à parte.
      </p>
    </>
  );
}
