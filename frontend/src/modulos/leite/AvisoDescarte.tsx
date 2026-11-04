import { useEffect, useState } from 'react';
import { useModulos } from '../../contexts/useModulos';
import { formatarData } from '../../utils/formatadores';
import { listarCarenciasHoje, type CarenciaHoje } from './api';

// "Leite em descarte" no Manejo (spec 004, FR-018), com o Leite ativo ou só consulta
export function AvisoDescarte() {
  const { situacaoDe } = useModulos();
  const situacao = situacaoDe('LEITE')?.situacao ?? 'NAO_CONTRATADO';
  const [carencias, setCarencias] = useState<CarenciaHoje[]>([]);

  useEffect(() => {
    if (situacao === 'NAO_CONTRATADO') return;
    listarCarenciasHoje()
      .then(setCarencias)
      .catch(() => setCarencias([]));
  }, [situacao]);

  if (carencias.length === 0) return null;

  return (
    <section className="faixa-descarte" aria-label="Leite em descarte">
      <h2>Leite em descarte</h2>
      <ul>
        {carencias.map((c) => (
          <li key={c.animalId}>
            Brinco {c.brinco} · {c.produto} · até {formatarData(c.dataFim)}
          </li>
        ))}
      </ul>
    </section>
  );
}
