import { useEffect, useState } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarCategoria, formatarReais } from '../../utils/formatadores';
import { buscarResultado, type DespesasPorCategoria, type ResultadoMensal, type ResultadoVendas } from './api';
import { GraficoMensal } from '../../components/graficos/GraficoMensal';
import { GraficoLinha } from '../../components/graficos/GraficoLinha';
import { mesAtual, nomeCurtoDoMes, nomeDoMes, somarMeses } from '../../utils/meses';

const PERIODOS = [3, 6, 12, 24, 36];

function classeValor(centavos: number) {
  return centavos < 0 ? 'valor-despesa' : 'valor-receita';
}

// Resultado da fazenda (spec 003, US3): receita × despesa e lucro por mês,
// para onde vai o dinheiro e as vendas de animais. Cancelados nunca entram.
export function Resultado() {
  const [meses, setMeses] = useState(12);
  const [dados, setDados] = useState<{
    mensal: ResultadoMensal;
    despesas: DespesasPorCategoria;
    vendas: ResultadoVendas;
  } | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const ate = mesAtual();
    buscarResultado({ de: somarMeses(ate, -(meses - 1)), ate })
      .then((d) => {
        setDados(d);
        setErro('');
      })
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [meses]);

  return (
    <div>
      <header>
        <h1>Resultado</h1>
      </header>

      <div className="filtro-linha">
        <label htmlFor="periodo">Período</label>
        <select id="periodo" value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
          {PERIODOS.map((p) => (
            <option key={p} value={p}>
              Últimos {p} meses
            </option>
          ))}
        </select>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!dados && !erro && <p>Carregando...</p>}

      {dados && (
        <>
          <section>
            <h2>
              {nomeDoMes(dados.mensal.de)} a {nomeDoMes(dados.mensal.ate)}
            </h2>
            <dl className="resumo-mes">
              <dt>Receitas</dt>
              <dd className="valor-receita">{formatarReais(dados.mensal.totais.receitaCentavos)}</dd>
              <dt>Despesas</dt>
              <dd className="valor-despesa">{formatarReais(dados.mensal.totais.despesaCentavos)}</dd>
              <dt>Lucro</dt>
              <dd className={classeValor(dados.mensal.totais.lucroCentavos)}>
                {formatarReais(dados.mensal.totais.lucroCentavos)}
              </dd>
            </dl>
            <GraficoMensal
              grupos={dados.mensal.meses.map((m) => ({
                chave: m.mes,
                rotulo: nomeCurtoDoMes(m.mes),
                valores: [m.receitaCentavos, m.despesaCentavos],
              }))}
              series={[
                { rotulo: 'Receitas', classe: 'barra-receita', classeLegenda: 'legenda-receita' },
                { rotulo: 'Despesas', classe: 'barra-despesa', classeLegenda: 'legenda-despesa' },
              ]}
              formatar={formatarReais}
              rotuloAria="Receitas e despesas por mês"
            />
            <div className="tabela-rolavel">
              <table className="tabela-resultado">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Receitas</th>
                    <th>Despesas</th>
                    <th>Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dados.mensal.meses].reverse().map((m) => (
                    <tr key={m.mes}>
                      <td>{nomeCurtoDoMes(m.mes)}</td>
                      <td>{formatarReais(m.receitaCentavos)}</td>
                      <td>{formatarReais(m.despesaCentavos)}</td>
                      <td className={classeValor(m.lucroCentavos)}>{formatarReais(m.lucroCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>Para onde vai o dinheiro</h2>
            {dados.despesas.categorias.length === 0 ? (
              <p>Nenhuma despesa no período.</p>
            ) : (
              <ul className="barras-categorias">
                {dados.despesas.categorias.map((c) => (
                  <li key={c.categoria}>
                    <div className="indicador-cabecalho">
                      <span>{c.categoria}</span>
                      <strong>
                        {formatarReais(c.valorCentavos)} · {c.percentual.toLocaleString('pt-BR')}%
                      </strong>
                    </div>
                    <div className="barra-fundo" aria-hidden="true">
                      <div className="barra-preenchida" style={{ width: `${c.percentual}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2>Vendas de animais</h2>
            {dados.vendas.animais === 0 ? (
              <p>Nenhuma venda no período.</p>
            ) : (
              <>
                <p>
                  {dados.vendas.animais === 1 ? '1 animal vendido' : `${dados.vendas.animais} animais vendidos`} ·{' '}
                  <strong className="valor-receita">{formatarReais(dados.vendas.totalCentavos)}</strong>
                </p>
                <ul>
                  {dados.vendas.porCategoria.map((c) => (
                    <li key={c.categoria}>
                      {formatarCategoria(c.categoria)}: {c.animais} · {formatarReais(c.valorCentavos)}
                    </li>
                  ))}
                </ul>
                <h3>Preço médio da arroba</h3>
                <GraficoLinha
                  pontos={dados.vendas.arrobaPorMes.map((m) => ({
                    chave: m.mes,
                    rotulo: nomeCurtoDoMes(m.mes),
                    valor: m.precoMedioArrobaCentavos,
                  }))}
                  formatar={(v) => `${formatarReais(v)} a arroba`}
                  rotuloAria="Preço médio da arroba por mês"
                  vazio="Sem vendas com peso no período."
                />
                <ul>
                  {dados.vendas.arrobaPorMes
                    .filter((m) => m.precoMedioArrobaCentavos !== null)
                    .map((m) => (
                      <li key={m.mes}>
                        {nomeCurtoDoMes(m.mes)}: {formatarReais(m.precoMedioArrobaCentavos)} a arroba ·{' '}
                        {m.arrobas.toLocaleString('pt-BR')} @
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
