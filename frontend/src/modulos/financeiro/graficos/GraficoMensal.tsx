import { formatarReais } from '../../../utils/formatadores';
import { nomeCurtoDoMes } from '../meses';

interface Mes {
  mes: string;
  receitaCentavos: number;
  despesaCentavos: number;
  lucroCentavos: number;
}

const ALTURA = 160;
const LARGURA_MES = 44;

// Receita × despesa por mês em barras (spec 003, FR-017; research R11). SVG
// próprio, sem biblioteca; a tabela abaixo traz os mesmos números para ler no
// celular e para leitores de tela.
export function GraficoMensal({ meses }: { meses: Mes[] }) {
  const maximo = Math.max(1, ...meses.flatMap((m) => [m.receitaCentavos, m.despesaCentavos]));
  const escala = (valor: number) => (valor / maximo) * (ALTURA - 20);
  const largura = Math.max(meses.length * LARGURA_MES, 300);

  return (
    <figure className="grafico">
      <div className="grafico-rolagem">
        <svg
          viewBox={`0 0 ${largura} ${ALTURA + 24}`}
          width={largura}
          height={ALTURA + 24}
          role="img"
          aria-label="Receitas e despesas por mês"
        >
          <line x1="0" y1={ALTURA} x2={largura} y2={ALTURA} className="grafico-eixo" />
          {meses.map((m, i) => {
            const x = i * LARGURA_MES + 8;
            const hR = escala(m.receitaCentavos);
            const hD = escala(m.despesaCentavos);
            return (
              <g key={m.mes}>
                <rect x={x} y={ALTURA - hR} width={13} height={hR} className="barra-receita">
                  <title>{`${nomeCurtoDoMes(m.mes)}: receitas ${formatarReais(m.receitaCentavos)}`}</title>
                </rect>
                <rect x={x + 15} y={ALTURA - hD} width={13} height={hD} className="barra-despesa">
                  <title>{`${nomeCurtoDoMes(m.mes)}: despesas ${formatarReais(m.despesaCentavos)}`}</title>
                </rect>
                <text x={x + 14} y={ALTURA + 16} textAnchor="middle" className="grafico-rotulo">
                  {nomeCurtoDoMes(m.mes)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="grafico-legenda">
        <span className="legenda-receita">Receitas</span>
        <span className="legenda-despesa">Despesas</span>
      </figcaption>
    </figure>
  );
}
