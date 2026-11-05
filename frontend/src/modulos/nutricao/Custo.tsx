import { useEffect, useState } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarReais } from '../../utils/formatadores';
import { mesAtual, nomeDoMes, somarMeses } from '../../utils/meses';
import { hojeLocal } from '../../utils/datas';
import { buscarCusto, formatarQuantidade, ROTULOS_BASE, type CustoPeriodo } from './api';

function fimDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number);
  return `${mes}-${String(new Date(ano, m, 0).getDate()).padStart(2, '0')}`;
}

// Custo da alimentação por lote, só para o dono (spec 005, US4, FR-022)
export function Custo() {
  const [mes, setMes] = useState(mesAtual());
  const [custo, setCusto] = useState<CustoPeriodo | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const ate = mes === mesAtual() ? hojeLocal() : fimDoMes(mes);
    buscarCusto(`${mes}-01`, ate)
      .then(setCusto)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [mes]);

  return (
    <div>
      <header>
        <h1>Custo da alimentação</h1>
      </header>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="ordenha-turnos" role="group" aria-label="Mês">
        <button type="button" className="botao-secundario" onClick={() => setMes(somarMeses(mes, -1))}>
          ‹ Anterior
        </button>
        <button type="button" className="botao-secundario" disabled={mes >= mesAtual()} onClick={() => setMes(somarMeses(mes, 1))}>
          Próximo ›
        </button>
      </div>
      <h2>{nomeDoMes(mes)}</h2>
      {custo && custo.insumosSemPreco.length > 0 && (
        <Aviso tipo="atencao">
          Sem preço (entra como zero): {custo.insumosSemPreco.join(', ')}. Informe o valor das entradas para o custo ficar certo.
        </Aviso>
      )}
      {custo && custo.lotes.length === 0 && <p>Nenhum trato lançado no período.</p>}
      {custo && custo.lotes.length > 0 && (
        <>
          <div className="tabela-rolavel">
            <table>
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Total</th>
                  <th>Animais-dia</th>
                  <th>Por animal/dia</th>
                </tr>
              </thead>
              <tbody>
                {custo.lotes.map((l) => (
                  <tr key={l.loteId}>
                    <td>{l.nome}</td>
                    <td>{formatarReais(l.totalCentavos)}</td>
                    <td>{l.animaisDia}</td>
                    <td>{l.porAnimalDiaCentavos === null ? '—' : formatarReais(l.porAnimalDiaCentavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {custo.lotes.map((l) => (
            <section key={l.loteId}>
              <h3>{l.nome}: para onde vai o dinheiro</h3>
              <ul className="barras-categorias">
                {l.insumos.map((i) => (
                  <li key={i.nome}>
                    <span>
                      {i.nome} · {formatarQuantidade(i.base, ROTULOS_BASE[i.unidadeBase])} · {formatarReais(i.totalCentavos)} ({i.percentual.toLocaleString('pt-BR')}%)
                    </span>
                    <div className="barra-fundo">
                      <div className="barra-preenchida" style={{ width: `${Math.max(i.percentual, 1)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
