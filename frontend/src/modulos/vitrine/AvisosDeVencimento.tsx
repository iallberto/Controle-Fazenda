import { useState } from 'react';
import { Aviso } from '../../components/Aviso';
import { useAuth } from '../../contexts/useAuth';
import { useModulos } from '../../contexts/useModulos';
import { ROTULOS_MODULO } from '../../utils/formatadores';

// Aviso de vencimento no painel inicial (spec 002, FR-016a): só para o dono,
// nos 10 dias anteriores ao término. Volta a cada login: quem fecha o aviso
// só o esconde até sair, porque a chave muda com o token da sessão.
const DIAS_DE_AVISO = 10;

function chaveDaSessao(token: string | null) {
  return `avisoVencimentoFechado:${token?.slice(-16) ?? ''}`;
}

export function AvisosDeVencimento() {
  const { usuario, token } = useAuth();
  const { modulos } = useModulos();
  const [fechados, setFechados] = useState<string[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(chaveDaSessao(token)) ?? '[]');
    } catch {
      return [];
    }
  });

  if (usuario?.papel !== 'DONO' || !modulos) return null;

  const vencendo = modulos.filter(
    (item) =>
      item.situacao === 'ATIVO' &&
      item.diasParaVencer !== null &&
      item.diasParaVencer >= 0 &&
      item.diasParaVencer <= DIAS_DE_AVISO &&
      !fechados.includes(item.modulo),
  );
  if (vencendo.length === 0) return null;

  function fechar(modulo: string) {
    const novos = [...fechados, modulo];
    setFechados(novos);
    try {
      sessionStorage.setItem(chaveDaSessao(token), JSON.stringify(novos));
    } catch {
      // Sem armazenamento, o aviso só fecha até recarregar a página
    }
  }

  return (
    <div className="avisos-vencimento">
      {vencendo.map((item) => {
        const quando =
          item.diasParaVencer === 0
            ? 'vence hoje'
            : item.diasParaVencer === 1
              ? 'vence amanhã'
              : `vence em ${item.diasParaVencer} dias`;
        return (
          <Aviso key={item.modulo} tipo="atencao" aoFechar={() => fechar(item.modulo)}>
            O módulo {ROTULOS_MODULO[item.modulo]} {quando} · fale com o suporte para renovar
          </Aviso>
        );
      })}
    </div>
  );
}
