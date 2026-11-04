import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData, formatarReais } from '../../utils/formatadores';
import { listarVendas, type VendaResumo } from './api';
import { useFinanceiro } from './FinanceiroContext';

// Vendas de animais registradas (spec 003, US2). As canceladas ficam na lista.
export function Vendas() {
  const { soConsulta } = useFinanceiro();
  const [vendas, setVendas] = useState<VendaResumo[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarVendas()
      .then(setVendas)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  return (
    <div>
      <header>
        <h1>Vendas de animais</h1>
        {!soConsulta && <Link to="/modulos/financeiro/vendas/nova">Nova venda</Link>}
      </header>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!vendas && !erro && <p>Carregando...</p>}
      {vendas && vendas.length === 0 && <p>Nenhuma venda registrada.</p>}

      {vendas && vendas.length > 0 && (
        <ul className="lista-lancamentos">
          {vendas.map((venda) => (
            <li key={venda.id} className={venda.cancelamento.cancelado ? 'cancelado' : undefined}>
              <div className="indicador-cabecalho">
                <span>
                  <Link to={`/modulos/financeiro/vendas/${venda.id}`}>
                    <strong>{venda.comprador}</strong>
                  </Link>
                  <br />
                  <small>
                    {formatarData(venda.data)} · {venda.animais === 1 ? '1 animal' : `${venda.animais} animais`} ·{' '}
                    {venda.forma === 'POR_ARROBA' ? 'por arroba' : 'valor total'}
                  </small>
                </span>
                <strong className="valor-receita">{formatarReais(venda.valorTotalCentavos)}</strong>
              </div>
              {venda.cancelamento.cancelado && (
                <small className="motivo-cancelado">Cancelada: {venda.cancelamento.motivoCancelamento}</small>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
