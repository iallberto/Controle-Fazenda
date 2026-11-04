import { formatarReais } from '../../../utils/formatadores';
import { nomeCurtoDoMes } from '../meses';

const ALTURA = 140;
const LARGURA_MES = 44;

// Preço médio da arroba mês a mês (spec 003, FR-019). Meses sem venda com
// peso ficam sem ponto e a linha não liga através deles.
export function GraficoLinha({ pontos }: { pontos: { mes: string; valor: number | null }[] }) {
  const valores = pontos.map((p) => p.valor).filter((v): v is number => v !== null);
  if (valores.length === 0) return <p>Sem vendas com peso no período.</p>;
  const minimo = Math.min(...valores) * 0.9;
  const maximo = Math.max(...valores) * 1.05;
  const y = (v: number) => ALTURA - ((v - minimo) / Math.max(1, maximo - minimo)) * (ALTURA - 24) - 8;
  const largura = Math.max(pontos.length * LARGURA_MES, 300);
  const x = (i: number) => i * LARGURA_MES + 22;

  // Trechos contínuos entre meses com valor
  const trechos: string[] = [];
  let atual: string[] = [];
  pontos.forEach((p, i) => {
    if (p.valor === null) {
      if (atual.length > 1) trechos.push(atual.join(' '));
      atual = [];
    } else {
      atual.push(`${x(i)},${y(p.valor)}`);
    }
  });
  if (atual.length > 1) trechos.push(atual.join(' '));

  return (
    <figure className="grafico">
      <div className="grafico-rolagem">
        <svg
          viewBox={`0 0 ${largura} ${ALTURA + 24}`}
          width={largura}
          height={ALTURA + 24}
          role="img"
          aria-label="Preço médio da arroba por mês"
        >
          <line x1="0" y1={ALTURA} x2={largura} y2={ALTURA} className="grafico-eixo" />
          {trechos.map((t) => (
            <polyline key={t} points={t} className="linha-arroba" />
          ))}
          {pontos.map((p, i) => (
            <g key={p.mes}>
              {p.valor !== null && (
                <circle cx={x(i)} cy={y(p.valor)} r={4} className="ponto-arroba">
                  <title>{`${nomeCurtoDoMes(p.mes)}: ${formatarReais(p.valor)} a arroba`}</title>
                </circle>
              )}
              <text x={x(i)} y={ALTURA + 16} textAnchor="middle" className="grafico-rotulo">
                {nomeCurtoDoMes(p.mes)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}
