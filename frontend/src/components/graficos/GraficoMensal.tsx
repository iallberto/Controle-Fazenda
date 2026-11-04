export interface SerieBarras {
  rotulo: string;
  classe: string; // classe CSS da barra (cor)
  classeLegenda: string;
}

export interface GrupoBarras {
  chave: string;
  rotulo: string; // texto curto no eixo (ex.: "nov/26", "04")
  valores: number[]; // um por série, na ordem de `series`
}

const ALTURA = 160;

// Barras agrupadas por período (spec 003, FR-017; spec 004, FR-026; research R11).
// SVG próprio, sem biblioteca; a tela traz uma tabela com os mesmos números
// para ler no celular e para leitores de tela.
export function GraficoMensal({
  grupos,
  series,
  formatar,
  rotuloAria,
}: {
  grupos: GrupoBarras[];
  series: SerieBarras[];
  formatar: (valor: number) => string;
  rotuloAria: string;
}) {
  const larguraBarra = 13;
  const larguraGrupo = Math.max(28, series.length * (larguraBarra + 2) + 14);
  const maximo = Math.max(1, ...grupos.flatMap((g) => g.valores));
  const escala = (valor: number) => (valor / maximo) * (ALTURA - 20);
  const largura = Math.max(grupos.length * larguraGrupo, 300);

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
          {grupos.map((g, i) => {
            const x = i * larguraGrupo + 8;
            return (
              <g key={g.chave}>
                {series.map((s, j) => {
                  const h = escala(g.valores[j] ?? 0);
                  return (
                    <rect
                      key={s.rotulo}
                      x={x + j * (larguraBarra + 2)}
                      y={ALTURA - h}
                      width={larguraBarra}
                      height={h}
                      className={s.classe}
                    >
                      <title>{`${g.rotulo}: ${s.rotulo.toLowerCase()} ${formatar(g.valores[j] ?? 0)}`}</title>
                    </rect>
                  );
                })}
                <text
                  x={x + (series.length * (larguraBarra + 2)) / 2}
                  y={ALTURA + 16}
                  textAnchor="middle"
                  className="grafico-rotulo"
                >
                  {g.rotulo}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="grafico-legenda">
        {series.map((s) => (
          <span key={s.rotulo} className={s.classeLegenda}>
            {s.rotulo}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
