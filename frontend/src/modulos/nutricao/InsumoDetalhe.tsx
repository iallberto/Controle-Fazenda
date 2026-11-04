import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { formatarData, formatarReais } from '../../utils/formatadores';
import {
  ativarUnidade,
  cancelarMovimento,
  criarUnidade,
  editarInsumo,
  formatarQuantidade,
  historicoDoInsumo,
  listarInsumos,
  numeroDeTexto,
  ROTULOS_BASE,
  ROTULOS_MOTIVO,
  textoDoEstoque,
  type InsumoEstoque,
  type MovimentoHistorico,
} from './api';
import { useNutricao } from './NutricaoContext';

// Insumo: estoque, unidades e histórico (spec 005, FR-004a, FR-009)
export function InsumoDetalhe() {
  const { id = '' } = useParams<{ id: string }>();
  const { soConsulta, ehDono } = useNutricao();
  const [insumo, setInsumo] = useState<InsumoEstoque | null>(null);
  const [historico, setHistorico] = useState<MovimentoHistorico[]>([]);
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [nomeUnidade, setNomeUnidade] = useState('');
  const [fator, setFator] = useState('');
  const [minimo, setMinimo] = useState('');

  const carregar = useCallback(() => {
    listarInsumos(true)
      .then((lista) => {
        const achado = lista.find((i) => i.id === id) ?? null;
        setInsumo(achado);
        setMinimo(achado?.estoqueMinimoBase == null ? '' : String(achado.estoqueMinimoBase).replace('.', ','));
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
    historicoDoInsumo(id)
      .then(setHistorico)
      .catch(() => setHistorico([]));
  }, [id]);

  useEffect(carregar, [carregar]);

  async function acao(fazer: () => Promise<unknown>, texto: string) {
    try {
      await fazer();
      setAviso({ tipo: 'sucesso', texto });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  function novaUnidade(evento: FormEvent) {
    evento.preventDefault();
    const valor = numeroDeTexto(fator);
    if (!valor || valor <= 0) {
      setAviso({ tipo: 'erro', texto: 'Informe o tamanho da unidade.' });
      return;
    }
    acao(() => criarUnidade(id, { nome: nomeUnidade, fator: valor }), `Unidade "${nomeUnidade}" criada.`);
    setNomeUnidade('');
    setFator('');
  }

  if (!insumo) return aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : <p>Carregando...</p>;
  const base = ROTULOS_BASE[insumo.unidadeBase];
  const podeEditar = ehDono && !soConsulta;

  return (
    <div>
      <header>
        <h1>{insumo.nome}</h1>
        <Link to="/modulos/nutricao/estoque">Estoque</Link>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <dl className="resumo-mes">
        <dt>Estoque</dt>
        <dd className={insumo.situacao === 'NORMAL' ? undefined : 'valor-despesa'}>{textoDoEstoque(insumo)}</dd>
        <dt>Mínimo</dt>
        <dd>{formatarQuantidade(insumo.estoqueMinimoBase, base)}</dd>
        {ehDono && insumo.custoMedioCentavosPorBase != null && (
          <>
            <dt>Custo médio</dt>
            <dd>
              {formatarReais(Math.round(insumo.custoMedioCentavosPorBase * 100) / 100)}/{base}
            </dd>
          </>
        )}
      </dl>

      {!soConsulta && (
        <section className="atalhos-modulo">
          <Link className="botao" to={`/modulos/nutricao/movimento?tipo=ENTRADA&insumo=${id}`}>
            Lançar entrada
          </Link>
          <Link className="botao" to={`/modulos/nutricao/movimento?tipo=BAIXA&insumo=${id}`}>
            Dar baixa
          </Link>
        </section>
      )}

      <section>
        <h2>Unidades</h2>
        <ul>
          {insumo.unidades.map((u) => (
            <li key={u.id}>
              {u.nome} = {formatarQuantidade(u.fator, base)}
              {u.id === insumo.unidadeCompraId && ' · unidade de compra'}
              {!u.ativa && ' · desativada'}
              {podeEditar && u.fator !== 1 && (
                <>
                  {' '}
                  {u.id !== insumo.unidadeCompraId && u.ativa && (
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => acao(() => editarInsumo(id, { unidadeCompraId: u.id }), 'Unidade de compra trocada.')}
                    >
                      Usar como compra
                    </button>
                  )}
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => acao(() => ativarUnidade(id, u.id, !u.ativa), u.ativa ? 'Unidade desativada.' : 'Unidade reativada.')}
                  >
                    {u.ativa ? 'Desativar' : 'Reativar'}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {podeEditar && (
          <form onSubmit={novaUnidade}>
            <label htmlFor="nova-unidade">Nova unidade (ex.: fardo)</label>
            <input id="nova-unidade" value={nomeUnidade} maxLength={30} onChange={(e) => setNomeUnidade(e.target.value)} required />
            <label htmlFor="fator-unidade">Quantos {base} tem</label>
            <input id="fator-unidade" inputMode="decimal" value={fator} onChange={(e) => setFator(e.target.value)} required />
            <button type="submit">Acrescentar unidade</button>
          </form>
        )}
        {podeEditar && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              acao(() => editarInsumo(id, { estoqueMinimo: numeroDeTexto(minimo) }), 'Estoque mínimo salvo.');
            }}
          >
            <label htmlFor="minimo">Estoque mínimo ({base})</label>
            <input id="minimo" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
            <button type="submit">Salvar mínimo</button>
            <button
              type="button"
              className="botao-secundario"
              onClick={() => acao(() => editarInsumo(id, { ativo: !insumo.ativo }), insumo.ativo ? 'Insumo desativado.' : 'Insumo reativado.')}
            >
              {insumo.ativo ? 'Desativar insumo' : 'Reativar insumo'}
            </button>
          </form>
        )}
      </section>

      <section>
        <h2>Histórico</h2>
        {historico.length === 0 && <p>Nenhum lançamento.</p>}
        <ul className="lista-vacas">
          {historico.map((m) => (
            <li key={m.id} className={`cartao-vaca${m.cancelamento.cancelado ? ' cartao-inativo' : ''}`}>
              <strong>
                {formatarData(m.data)} · {m.tipo === 'ENTRADA' ? '+' : '−'}
                {formatarQuantidade(m.quantidade, m.unidade ?? '')}
              </strong>
              <span>
                {ROTULOS_MOTIVO[m.motivo] ?? m.motivo}
                {m.fornecedor && ` · ${m.fornecedor}`}
                {m.observacao && ` · ${m.observacao}`}
                {m.aguardandoPreco && ' · aguardando preço'}
                {ehDono && m.valorCentavos != null && ` · ${formatarReais(m.valorCentavos)}`}
              </span>
              {m.cancelamento.cancelado ? (
                <span>Cancelado: {m.cancelamento.motivoCancelamento}</span>
              ) : (
                m.avulso &&
                !soConsulta && (
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => {
                      const motivo = window.prompt('Motivo do cancelamento');
                      if (motivo) acao(() => cancelarMovimento(m.id, motivo), 'Lançamento cancelado.');
                    }}
                  >
                    Cancelar
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
