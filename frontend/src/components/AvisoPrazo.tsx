import { useEffect, useState } from 'react';
import { buscarAcesso, linkWhatsapp, type AcessoDaFazenda } from '../api/acesso';
import { useAuth } from '../contexts/useAuth';
import { formatarData, formatarReais } from '../utils/formatadores';

// Aviso do prazo de acesso no topo das telas (spec 008, US3). O dono vê os dias
// que faltam e, nos últimos 5 dias, na carência e depois de vencer, o valor, a
// chave Pix e o botão para mandar o comprovante. O funcionário só vê quando a
// fazenda está só para consulta. O suporte não vê nada.
export function AvisoPrazo() {
  const { usuario } = useAuth();
  const [acesso, setAcesso] = useState<AcessoDaFazenda | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (usuario?.suporte) return;
    buscarAcesso()
      .then(setAcesso)
      .catch(() => setAcesso(null));
  }, [usuario?.suporte]);

  if (!acesso || usuario?.suporte || acesso.situacao === 'SEM_PRAZO') return null;
  const ehDono = usuario?.papel === 'DONO';

  if (acesso.situacao === 'AGUARDANDO_IMPLANTACAO') {
    return (
      <div className="aviso-prazo nao-imprimir">
        <strong>Aguardando implantação.</strong> Por enquanto a fazenda é só para consulta; o acesso completo é
        liberado depois do cadastro do rebanho.
      </div>
    );
  }

  if (!ehDono) {
    if (acesso.situacao !== 'VENCIDO') return null;
    return (
      <div className="aviso-prazo aviso-prazo-vencido nao-imprimir">
        <strong>Fazenda só para consulta.</strong> Fale com o dono da fazenda.
      </div>
    );
  }

  const ate = acesso.acessoAte ? formatarData(acesso.acessoAte) : '';
  const dias = acesso.diasRestantes ?? 0;
  const titulo =
    acesso.situacao === 'EM_DIA'
      ? `${acesso.emTeste ? 'Teste grátis' : 'Acesso'} até ${ate}: ${dias === 0 ? 'último dia' : dias === 1 ? 'falta 1 dia' : `faltam ${dias} dias`}.`
      : acesso.situacao === 'CARENCIA'
        ? `O prazo venceu em ${ate}. ${acesso.diasCarencia === 0 ? 'Hoje é o último dia de carência.' : `Faltam ${acesso.diasCarencia} dia(s) de carência.`}`
        : `O prazo venceu em ${ate}: a fazenda está só para consulta.`;

  async function copiarChave() {
    if (!acesso?.pixChave) return;
    try {
      await navigator.clipboard.writeText(acesso.pixChave);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  const mensagem = `Olá, segue o comprovante do Pix da ${acesso.fazendaNome}${
    acesso.valorCentavos ? ` (${formatarReais(acesso.valorCentavos)})` : ''
  }.`;

  return (
    <div
      className={`aviso-prazo nao-imprimir${acesso.situacao === 'VENCIDO' ? ' aviso-prazo-vencido' : ''}${
        acesso.mostrarPagamento ? ' aviso-prazo-pagamento' : ''
      }`}
    >
      <p>
        <strong>{titulo}</strong>
      </p>
      {acesso.mostrarPagamento && (
        <>
          <p>
            Para liberar mais 30 dias, pague{' '}
            <strong>{acesso.valorCentavos ? formatarReais(acesso.valorCentavos) : 'o valor combinado'}</strong> por Pix e
            envie o comprovante ao suporte.
          </p>
          {acesso.pixChave && (
            <p className="aviso-prazo-pix">
              Chave Pix: <code>{acesso.pixChave}</code>{' '}
              <button type="button" className="botao-secundario" onClick={copiarChave}>
                {copiado ? 'Copiada' : 'Copiar'}
              </button>
            </p>
          )}
          <a className="botao" href={linkWhatsapp(acesso.whatsappSuporte, mensagem)} target="_blank" rel="noreferrer">
            Enviar comprovante no WhatsApp
          </a>
        </>
      )}
    </div>
  );
}
