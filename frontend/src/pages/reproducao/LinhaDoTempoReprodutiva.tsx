import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buscarHistoricoReprodutivo, type EventoReprodutivo } from '../../api/reproducao';
import {
  formatarData,
  formatarIdadeGestacional,
  formatarMetodoDiagnostico,
  formatarMotivoFimExposicao,
  formatarResultadoDiagnostico,
  formatarResultadoParto,
  formatarTipoParto,
  rotuloBrinco,
} from '../../utils/formatadores';

function descricao(evento: EventoReprodutivo) {
  switch (evento.tipo) {
    case 'EXPOSICAO':
      return (
        <>
          <Link to={`/reproducao/estacoes/${evento.estacaoId}`}>
            Exposta ao touro {evento.touroBrinco ? rotuloBrinco(evento.touroBrinco) : ''}
          </Link>
          {evento.pasto && ` no ${evento.pasto}`}
          {evento.dataFim &&
            ` até ${formatarData(evento.dataFim)}${evento.motivoFim ? ` (${formatarMotivoFimExposicao(evento.motivoFim).toLowerCase()})` : ''}`}
        </>
      );
    case 'INSEMINACAO':
      return `Inseminação ${evento.tipoInseminacao}${evento.semen ? ` com ${evento.semen}` : ''}`;
    case 'DIAGNOSTICO':
      return (
        `Diagnóstico: ${formatarResultadoDiagnostico(evento.resultado).toLowerCase()}` +
        (evento.metodo ? ` (${formatarMetodoDiagnostico(evento.metodo).toLowerCase()})` : '') +
        (evento.idadeGestacionalDias ? ` · ${formatarIdadeGestacional(evento.idadeGestacionalDias)}` : '')
      );
    case 'PERDA':
      return `Perda de gestação${evento.motivo ? `: ${evento.motivo}` : ''}`;
    case 'PARTO':
      return `Parto: ${formatarResultadoParto(evento.resultado).toLowerCase()} (${formatarTipoParto(evento.tipoParto).toLowerCase()})`;
  }
}

// Linha do tempo reprodutiva da fêmea (FR-023): estações, inseminações,
// diagnósticos, perdas e partos. Cancelados ficam riscados, com o motivo.
export function LinhaDoTempoReprodutiva({ animalId }: { animalId: string }) {
  const [eventos, setEventos] = useState<EventoReprodutivo[] | null>(null);

  useEffect(() => {
    buscarHistoricoReprodutivo(animalId)
      .then(setEventos)
      .catch(() => setEventos([]));
  }, [animalId]);

  return (
    <section>
      <h2>Linha do tempo reprodutiva</h2>
      {!eventos && <p>Carregando...</p>}
      {eventos && eventos.length === 0 && <p>Nenhum registro de reprodução ainda.</p>}
      {eventos && eventos.length > 0 && (
        <ul className="linha-do-tempo">
          {eventos.map((evento) => (
            <li key={`${evento.tipo}-${evento.id}`}>
              <span className={evento.cancelado ? 'cancelado' : undefined}>
                <strong>{formatarData(evento.data)}</strong> — {descricao(evento)}
              </span>
              {evento.cancelado && (
                <small className="motivo-cancelado">
                  Cancelado{evento.motivoCancelamento ? `: ${evento.motivoCancelamento}` : ''}
                </small>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
