import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Aviso } from '../../components/Aviso';
import { useAuth } from '../../contexts/useAuth';
import { useModulos } from '../../contexts/useModulos';
import { buscarPendencias } from './api';

function chaveDaSessao(token: string | null) {
  return `avisoPendenciasFechado:${token?.slice(-16) ?? ''}`;
}

// Aviso no painel inicial do dono, a cada login, enquanto houver animais
// comprados sem valor ou usos esperando valor (spec 003, FR-016c)
export function AvisoPendencias() {
  const { usuario, token } = useAuth();
  const { situacaoDe } = useModulos();
  const ativo = usuario?.papel === 'DONO' && situacaoDe('FINANCEIRO')?.situacao === 'ATIVO';
  const [pendencias, setPendencias] = useState<{ usosAguardando: number; comprasSemValor: number } | null>(null);
  const [fechado, setFechado] = useState(() => {
    try {
      return sessionStorage.getItem(chaveDaSessao(token)) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!ativo) return;
    buscarPendencias()
      .then(setPendencias)
      .catch(() => setPendencias(null));
  }, [ativo]);

  if (!ativo || fechado || !pendencias) return null;
  const { comprasSemValor, usosAguardando } = pendencias;
  if (comprasSemValor === 0 && usosAguardando === 0) return null;

  function fechar() {
    setFechado(true);
    try {
      sessionStorage.setItem(chaveDaSessao(token), '1');
    } catch {
      // Sem armazenamento, o aviso só fecha até recarregar a página
    }
  }

  return (
    <div className="avisos-vencimento">
      <Aviso tipo="atencao" aoFechar={fechar}>
        {comprasSemValor > 0 && (
          <>
            Funcionários cadastraram{' '}
            {comprasSemValor === 1 ? '1 animal comprado' : `${comprasSemValor} animais comprados`} sem valor · informe
            o valor de compra para o balanço da fazenda.{' '}
          </>
        )}
        {usosAguardando > 0 && (
          <>
            {usosAguardando === 1 ? '1 registro de uso espera' : `${usosAguardando} registros de uso esperam`} o
            valor.{' '}
          </>
        )}
        <Link to="/modulos/financeiro/pendencias">Ver pendências</Link>
      </Aviso>
    </div>
  );
}
