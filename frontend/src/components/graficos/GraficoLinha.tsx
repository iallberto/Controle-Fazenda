const ALTURA = 140;
const LARGURA_PONTO = 44;

export interface PontoLinha {
  chave: string;
  rotulo: string; // texto curto no eixo
  valor: number | null; // sem valor: sem ponto, e a linha não liga através dele
}

// Linha de um valor ao longo do tempo (spec 003, FR-019; spec 004, FR-028).
// Rótulos do eixo podem ser pulados (`cadaRotulo`) quando há muitos pontos.
export function GraficoLinha({
  pontos,
  formatar,
  rotuloAria,
  vazio,
  larguraPonto = LARGURA_PONTO,
  cadaRotulo = 1,
}: {
  pontos: PontoLinha[];
  formatar: (valor: number) => string;
  rotuloAria: string;
  vazio: string;
  larguraPonto?: number;
  cadaRotulo?: number;
}) {
  const valores = pontos.map((p) => p.valor).filter((v): v is number => v !== null);
  if (valores.length === 0) return <p>{vazio}</p>;
  const minimo = Math.min(...valores) * 0.9;
  const maximo = Math.max(...valores) * 1.05;
  const y = (v: number) =>
    ALTURA - ((v - minimo) / Math.max(1e-9, maximo - minimo)) * (ALTURA - 24) - 8;
  const largura = Math.max(pontos.length * larguraPonto + 30, 300);
  const x = (i: number) => i * larguraPonto + 22;

  // Trechos contínuos entre pontos com valor
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
          aria-label={rotuloAria}
        >
          <line x1="0" y1={ALTURA} x2={largura} y2={ALTURA} className="grafico-eixo" />
          {trechos.map((t) => (
            <polyline key={t} points={t} className="linha-arroba" />
          ))}
          {pontos.map((p, i) => (
            <g key={p.chave}>
              {p.valor !== null && (
                <circle cx={x(i)} cy={y(p.valor)} r={larguraPonto < 20 ? 2.5 : 4} className="ponto-arroba">
                  <title>{`${p.rotulo}: ${formatar(p.valor)}`}</title>
                </circle>
              )}
              {i % cadaRotulo === 0 && (
                <text x={x(i)} y={ALTURA + 16} textAnchor="middle" className="grafico-rotulo">
                  {p.rotulo}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}
