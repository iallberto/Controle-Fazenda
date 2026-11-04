import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { BotaoCancelar } from '../../components/BotaoCancelar';
import { formatarCategoria, formatarData, formatarReais, rotuloBrinco } from '../../utils/formatadores';
import { buscarVenda, cancelarVenda, type VendaDetalhe as Venda } from './api';
import { useFinanceiro } from './FinanceiroContext';

function formatarArrobas(arrobas: number | null) {
  return arrobas === null ? '—' : `${arrobas.toFixed(2).replace('.', ',')} @`;
}

// Uma venda com os animais, peso, arrobas e a parte do valor de cada um.
// Cancelar devolve os animais ao pasto de antes e cancela a receita (FR-015).
export function VendaDetalhe() {
  const { id = '' } = useParams<{ id: string }>();
  const { soConsulta } = useFinanceiro();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    buscarVenda(id)
      .then(setVenda)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function handleCancelar(motivo: string) {
    setAviso(null);
    try {
      await cancelarVenda(id, motivo);
      setAviso({
        tipo: 'sucesso',
        texto: 'Venda cancelada. A receita saiu dos totais e os animais voltaram ao rebanho, no pasto de antes.',
      });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  if (!venda) {
    return aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : <p>Carregando...</p>;
  }

  return (
    <div>
      <header>
        <h1>Venda para {venda.comprador}</h1>
        <Link to="/modulos/financeiro/vendas">Vendas</Link>
      </header>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <section className={venda.cancelamento.cancelado ? 'cancelado' : undefined}>
        <p>
          {formatarData(venda.data)} ·{' '}
          {venda.forma === 'POR_ARROBA'
            ? `${formatarReais(venda.precoArrobaCentavos)} a arroba`
            : 'por valor total'}
        </p>
        <p className="valor-destaque valor-receita">{formatarReais(venda.valorTotalCentavos)}</p>
        {venda.observacao && <p>{venda.observacao}</p>}
        {venda.cancelamento.cancelado && (
          <p className="motivo-cancelado">Cancelada: {venda.cancelamento.motivoCancelamento}</p>
        )}
      </section>

      <section>
        <h2>Animais ({venda.itens.length})</h2>
        <ul className="lista-lancamentos">
          {venda.itens.map((item) => (
            <li key={item.animalId}>
              <div className="indicador-cabecalho">
                <span>
                  <Link to={`/animais/${item.animalId}`}>{rotuloBrinco(item.brinco)}</Link> ·{' '}
                  {formatarCategoria(item.categoria)}
                  <br />
                  <small>
                    {item.pesoKg === null ? 'sem peso' : `${String(item.pesoKg).replace('.', ',')} kg`} ·{' '}
                    {formatarArrobas(item.arrobas)}
                    {item.pastoAnterior && ` · saiu do ${item.pastoAnterior}`}
                  </small>
                </span>
                <strong>{formatarReais(item.valorCentavos)}</strong>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {!soConsulta && !venda.cancelamento.cancelado && (
        <section>
          <h2>Cancelar a venda</h2>
          <p>Cancele só se a venda não aconteceu: os animais voltam ao rebanho com o mesmo brinco.</p>
          <BotaoCancelar aoConfirmar={handleCancelar} />
        </section>
      )}
    </div>
  );
}
