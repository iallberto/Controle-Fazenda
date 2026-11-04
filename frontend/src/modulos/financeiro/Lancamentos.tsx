import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { BotaoCancelar } from '../../components/BotaoCancelar';
import { formatarData, formatarReais, rotuloBrinco } from '../../utils/formatadores';
import {
  cancelarLancamento,
  listarCategorias,
  listarLancamentos,
  type CategoriaFinanceira,
  type MesFinanceiro,
  type TipoLancamento,
} from './api';
import { useFinanceiro } from './FinanceiroContext';
import { mesAtual, nomeDoMes, somarMeses } from '../../utils/meses';

// Lançamentos do mês com receita, despesa e saldo (spec 003, FR-007). Os
// cancelados ficam na lista, riscados, e fora dos totais (FR-008).
export function Lancamentos() {
  const { soConsulta } = useFinanceiro();
  const [mes, setMes] = useState(mesAtual);
  const [tipo, setTipo] = useState<TipoLancamento | ''>('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [dados, setDados] = useState<MesFinanceiro | null>(null);
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    listarLancamentos({ mes, tipo: tipo || undefined, categoriaId: categoriaId || undefined })
      .then(setDados)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, [mes, tipo, categoriaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    listarCategorias({ incluirInativas: true })
      .then(setCategorias)
      .catch(() => {});
  }, []);

  async function handleCancelar(id: string, motivo: string) {
    setAviso(null);
    try {
      await cancelarLancamento(id, motivo);
      setAviso({ tipo: 'sucesso', texto: 'Lançamento cancelado.' });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  return (
    <div>
      <header>
        <h1>Lançamentos</h1>
        {!soConsulta && <Link to="/modulos/financeiro/lancamentos/novo">Novo lançamento</Link>}
      </header>

      <div className="seletor-mes">
        <button type="button" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>
          ‹
        </button>
        <strong>{nomeDoMes(mes)}</strong>
        <button type="button" aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>
          ›
        </button>
      </div>

      <div className="filtro-linha">
        <label htmlFor="filtro-tipo">Tipo</label>
        <select
          id="filtro-tipo"
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as TipoLancamento | '');
            setCategoriaId('');
          }}
        >
          <option value="">Receitas e despesas</option>
          <option value="RECEITA">Só receitas</option>
          <option value="DESPESA">Só despesas</option>
        </select>
        <label htmlFor="filtro-categoria">Categoria</label>
        <select id="filtro-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
          <option value="">Todas</option>
          {categorias
            .filter((c) => !tipo || c.tipo === tipo)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </select>
      </div>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {dados && (
        <>
          <dl className="resumo-mes">
            <dt>Receitas</dt>
            <dd className="valor-receita">{formatarReais(dados.receitaCentavos)}</dd>
            <dt>Despesas</dt>
            <dd className="valor-despesa">{formatarReais(dados.despesaCentavos)}</dd>
            <dt>Saldo</dt>
            <dd className={dados.saldoCentavos < 0 ? 'valor-despesa' : 'valor-receita'}>
              {formatarReais(dados.saldoCentavos)}
            </dd>
          </dl>

          {dados.lancamentos.length === 0 ? (
            <p>Nenhum lançamento neste mês.</p>
          ) : (
            <ul className="lista-lancamentos">
              {dados.lancamentos.map((l) => {
                const editavel = !soConsulta && !l.cancelamento.cancelado && (l.origem === 'MANUAL' || l.origem === 'USO');
                return (
                  <li key={l.id} className={l.cancelamento.cancelado ? 'cancelado' : undefined}>
                    <div className="indicador-cabecalho">
                      <span>
                        <strong>{l.descricao}</strong>
                        <br />
                        <small>
                          {formatarData(l.data)} · {l.categoria?.nome}
                          {l.animal && ` · ${rotuloBrinco(l.animal.brinco)}`}
                          {l.pasto && ` · ${l.pasto.nome}`}
                        </small>
                      </span>
                      <strong className={l.tipo === 'RECEITA' ? 'valor-receita' : 'valor-despesa'}>
                        {l.tipo === 'DESPESA' ? '− ' : '+ '}
                        {formatarReais(l.valorCentavos)}
                      </strong>
                    </div>
                    {l.cancelamento.cancelado && (
                      <small className="motivo-cancelado">Cancelado: {l.cancelamento.motivoCancelamento}</small>
                    )}
                    {l.vendaId && (
                      <small>
                        <Link to={`/modulos/financeiro/vendas/${l.vendaId}`}>Ver a venda</Link>
                      </small>
                    )}
                    {editavel && (
                      <span className="acoes-lancamento">
                        <Link to={`/modulos/financeiro/lancamentos/${l.id}/editar`} state={{ lancamento: l }}>
                          Corrigir
                        </Link>
                        <BotaoCancelar aoConfirmar={(motivo) => handleCancelar(l.id, motivo)} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
