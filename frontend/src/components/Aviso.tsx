import { useEffect, useRef, type ReactNode } from 'react';
import { usePreferencias } from '../contexts/usePreferencias';
import { tocarSom } from '../utils/sons';

export type TipoAviso = 'sucesso' | 'erro' | 'atencao';

// Estado de um aviso numa tela: null quando não há nada a mostrar
export type EstadoAviso = { tipo: TipoAviso; texto: string } | null;

const ICONES: Record<TipoAviso, string> = {
  sucesso: '✓',
  erro: '!',
  atencao: '⚠',
};

interface AvisoProps {
  tipo: TipoAviso;
  children: ReactNode;
  aoFechar?: () => void;
}

// Mensagem padronizada depois de salvar, carregar ou buscar. A cor e o ícone
// separam sucesso de erro, e o leitor de tela anuncia o texto (role alert/status).
export function Aviso({ tipo, children, aoFechar }: AvisoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const preferencias = usePreferencias();
  const somAtivo = preferencias?.somAtivo ?? false;
  const som = preferencias?.som ?? 'SINO';

  // Som de confirmação (M14): útil no curral, sem olhar para a tela.
  // Só quando o aviso aparece ou muda de texto, não a cada renderização.
  useEffect(() => {
    if (!somAtivo) return;
    if (tipo === 'sucesso') tocarSom(som);
    if (tipo === 'erro') tocarSom('ERRO');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  // No celular o aviso pode surgir fora da tela (ex.: salvou um campo lá embaixo).
  // "nearest" só rola quando ele não está visível.
  useEffect(() => {
    const semAnimacao = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollIntoView({ block: 'nearest', behavior: semAnimacao ? 'auto' : 'smooth' });
  }, [children]);

  return (
    <div ref={ref} className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <span className="aviso-icone" aria-hidden="true">
        {ICONES[tipo]}
      </span>
      <div className="aviso-texto">{children}</div>
      {aoFechar && (
        <button type="button" className="aviso-fechar" aria-label="Fechar aviso" onClick={aoFechar}>
          ×
        </button>
      )}
    </div>
  );
}
