import { useState } from 'react';

// Cancelamento de um registro numa linha da lista: pede o motivo ali mesmo (FR-026)
export function BotaoCancelar({ aoConfirmar }: { aoConfirmar: (motivo: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  if (!aberto) {
    return (
      <button type="button" className="botao-link" onClick={() => setAberto(true)}>
        Cancelar
      </button>
    );
  }
  return (
    <span className="cancelar-inline">
      <input
        aria-label="Motivo do cancelamento"
        placeholder="Motivo"
        maxLength={200}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <button type="button" disabled={!motivo.trim()} onClick={() => aoConfirmar(motivo)}>
        Confirmar
      </button>
    </span>
  );
}
