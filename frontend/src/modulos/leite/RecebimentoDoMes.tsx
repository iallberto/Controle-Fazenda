import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { useModulos } from '../../contexts/useModulos';
import { centavosDeTexto, formatarData, formatarReais } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import { nomeDoMes } from '../../utils/meses';
import {
  buscarRecebimento,
  confirmarRecebimento,
  desfazerRecebimento,
  formatarLitros,
  type RecebimentoDoMes as Recebimento,
} from './api';

// Recebimento do leite do mês, só o dono (spec 006, US1): o laticínio pagou,
// o dono confirma a data e o valor; com o Financeiro ativo vira receita.
// Todas as entregas do mês precisam de preço (FR-006b).
export function RecebimentoDoMes({
  mes,
  soConsulta,
  versao,
  aoMudar,
}: {
  mes: string;
  soConsulta: boolean;
  versao: number;
  aoMudar: () => void;
}) {
  const { situacaoDe } = useModulos();
  const comFinanceiro = situacaoDe('FINANCEIRO')?.situacao === 'ATIVO';
  const [dados, setDados] = useState<Recebimento | null>(null);
  const [data, setData] = useState(hojeLocal());
  const [valor, setValor] = useState('');
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    buscarRecebimento(mes)
      .then((r) => {
        setDados(r);
        setValor((r.previsto.totalCalculadoCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, [mes]);

  useEffect(carregar, [carregar, versao]);

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    const centavos = centavosDeTexto(valor);
    if (!centavos) {
      setAviso({ tipo: 'erro', texto: 'Informe o valor recebido.' });
      return;
    }
    try {
      await confirmarRecebimento({ mes, data, valorRecebidoCentavos: centavos });
      setAviso({
        tipo: 'sucesso',
        texto: comFinanceiro ? 'Recebimento confirmado e lançado no Financeiro.' : 'Recebimento confirmado.',
      });
      carregar();
      aoMudar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function desfazer(id: string) {
    const motivo = window.prompt('Motivo para desfazer o recebimento');
    if (!motivo) return;
    try {
      await desfazerRecebimento(id, motivo);
      setAviso({ tipo: 'sucesso', texto: 'Recebimento desfeito; as entregas do mês podem ser corrigidas.' });
      carregar();
      aoMudar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  if (!dados) return aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null;
  const { recebimento, previsto } = dados;

  return (
    <section className="ordenha-vaca" aria-label="Recebimento do mês">
      <h3>Recebimento de {nomeDoMes(mes).toLowerCase()}</h3>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {recebimento ? (
        <>
          <p>
            Recebido em {formatarData(recebimento.data)}: <strong>{formatarReais(recebimento.valorRecebidoCentavos)}</strong>{' '}
            por {formatarLitros(recebimento.litros)}
          </p>
          {recebimento.diferencaCentavos !== 0 && (
            <p className="dica">
              Calculado pelas entregas: {formatarReais(recebimento.totalCalculadoCentavos)} · diferença{' '}
              {formatarReais(recebimento.diferencaCentavos)}
            </p>
          )}
          <p className="dica">As entregas deste mês ficam travadas enquanto o recebimento estiver confirmado.</p>
          {!soConsulta && (
            <button type="button" className="botao-secundario" onClick={() => desfazer(recebimento.id)}>
              Desfazer recebimento
            </button>
          )}
        </>
      ) : previsto.entregas === 0 ? (
        <p className="dica">Sem entregas neste mês.</p>
      ) : previsto.entregasSemPreco.length > 0 ? (
        <p className="dica">
          {previsto.entregasSemPreco.length} entrega(s) sem preço (
          {previsto.entregasSemPreco.map((e) => formatarData(e.data)).join(', ')}): informe o preço para
          confirmar o recebimento.
        </p>
      ) : (
        !soConsulta && (
          <form onSubmit={confirmar}>
            <p>
              Calculado: {formatarReais(previsto.totalCalculadoCentavos)} por {formatarLitros(previsto.litros)}
            </p>
            <label htmlFor="data-recebimento">Data do recebimento</label>
            <input
              id="data-recebimento"
              type="date"
              value={data}
              min={`${mes}-01`}
              max={hojeLocal()}
              onChange={(e) => setData(e.target.value)}
              required
            />
            <label htmlFor="valor-recebido">Valor recebido (ajuste se houve bonificação ou desconto)</label>
            <input id="valor-recebido" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} required />
            <button type="submit">Confirmar recebimento</button>
            {comFinanceiro && <p className="dica">Vira receita em "Venda de leite" no Financeiro.</p>}
          </form>
        )
      )}
    </section>
  );
}
