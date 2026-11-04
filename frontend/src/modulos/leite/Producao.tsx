import { useEffect, useState } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { GraficoMensal } from '../../components/graficos/GraficoMensal';
import { formatarData } from '../../utils/formatadores';
import { mesAtual, nomeCurtoDoMes, nomeDoMes, somarMeses } from '../../utils/meses';
import {
  buscarProducaoDiaria,
  buscarProducaoMensal,
  formatarLitros,
  type ProducaoDiaria,
  type ProducaoMensal,
} from './api';

const SERIES = [
  { rotulo: 'Para o tanque', classe: 'barra-receita', classeLegenda: 'legenda-receita' },
  { rotulo: 'Descartado', classe: 'barra-despesa', classeLegenda: 'legenda-despesa' },
];

// Último dia de um mês AAAA-MM (sem passar de hoje fica a cargo do servidor)
function fimDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  return `${mes}-${String(new Date(ano, m, 0).getDate()).padStart(2, '0')}`;
}

// Produção diária do mês e mensal dos últimos 12 meses (spec 004, FR-026,
// FR-027), com a média de litros por vaca em lactação. Gráfico e tabela com
// os mesmos números.
export function Producao() {
  const [mes, setMes] = useState(mesAtual());
  const [diaria, setDiaria] = useState<ProducaoDiaria | null>(null);
  const [mensal, setMensal] = useState<ProducaoMensal | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const ate = mes === mesAtual() ? undefined : fimDoMes(mes);
    buscarProducaoDiaria(`${mes}-01`, ate)
      .then(setDiaria)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [mes]);

  useEffect(() => {
    buscarProducaoMensal()
      .then(setMensal)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  return (
    <div>
      <header>
        <h1>Produção</h1>
      </header>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="ordenha-turnos" role="group" aria-label="Mês">
        <button type="button" className="botao-secundario" onClick={() => setMes(somarMeses(mes, -1))}>
          ‹ Anterior
        </button>
        <button
          type="button"
          className="botao-secundario"
          disabled={mes >= mesAtual()}
          onClick={() => setMes(somarMeses(mes, 1))}
        >
          Próximo ›
        </button>
      </div>

      {diaria && (
        <section>
          <h2>{nomeDoMes(mes)}</h2>
          <dl className="resumo-mes">
            <dt>Leite para o tanque</dt>
            <dd>{formatarLitros(diaria.totais.paraTanque)}</dd>
            <dt>Leite descartado</dt>
            <dd className={diaria.totais.descartado > 0 ? 'valor-despesa' : undefined}>
              {formatarLitros(diaria.totais.descartado)}
            </dd>
            <dt>Média por vaca em lactação</dt>
            <dd>{diaria.totais.mediaPorVaca === null ? '—' : `${formatarLitros(diaria.totais.mediaPorVaca)}/dia`}</dd>
          </dl>
          <GraficoMensal
            grupos={diaria.dias.map((d) => ({
              chave: d.data,
              rotulo: d.data.slice(8),
              valores: [d.paraTanque, d.descartado],
            }))}
            series={SERIES}
            formatar={formatarLitros}
            rotuloAria="Litros por dia"
          />
          <div className="tabela-rolavel">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Tanque</th>
                  <th>Desc.</th>
                  <th>Vacas</th>
                  <th>Média</th>
                </tr>
              </thead>
              <tbody>
                {diaria.dias
                  .filter((d) => d.total > 0 || d.vacasEmLactacao > 0)
                  .map((d) => (
                    <tr key={d.data}>
                      <td>{formatarData(d.data).slice(0, 5)}</td>
                      <td>{formatarLitros(d.paraTanque)}</td>
                      <td>{d.descartado > 0 ? formatarLitros(d.descartado) : '—'}</td>
                      <td>{d.vacasEmLactacao}</td>
                      <td>{d.mediaPorVaca === null ? '—' : formatarLitros(d.mediaPorVaca)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mensal && (
        <section>
          <h2>Últimos 12 meses</h2>
          <GraficoMensal
            grupos={mensal.meses.map((m) => ({
              chave: m.mes,
              rotulo: nomeCurtoDoMes(m.mes),
              valores: [m.paraTanque, m.descartado],
            }))}
            series={SERIES}
            formatar={formatarLitros}
            rotuloAria="Litros por mês"
          />
          <div className="tabela-rolavel">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Tanque</th>
                  <th>Desc.</th>
                  <th>Média/vaca/dia</th>
                </tr>
              </thead>
              <tbody>
                {mensal.meses.map((m) => (
                  <tr key={m.mes}>
                    <td>{nomeCurtoDoMes(m.mes)}</td>
                    <td>{formatarLitros(m.paraTanque)}</td>
                    <td>{m.descartado > 0 ? formatarLitros(m.descartado) : '—'}</td>
                    <td>{m.mediaPorVaca === null ? '—' : formatarLitros(m.mediaPorVaca)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
