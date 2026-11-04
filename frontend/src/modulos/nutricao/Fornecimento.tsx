import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { formatarData } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import {
  buscarSugestao,
  cancelarFornecimento,
  codigoDoErro,
  formatarQuantidade,
  gravarFornecimento,
  listarFornecimentos,
  listarInsumos,
  listarLotes,
  numeroDeTexto,
  type FornecimentoLista,
  type InsumoEstoque,
  type LoteResumo,
  type Sugestao,
} from './api';
import { useNutricao } from './NutricaoContext';

const CHAVE_LOTE = 'nutricao.ultimoLote';

function lerUltimoLote() {
  try {
    return localStorage.getItem(CHAVE_LOTE) ?? '';
  } catch {
    return '';
  }
}

function guardarUltimoLote(id: string) {
  try {
    localStorage.setItem(CHAVE_LOTE, id);
  } catch {
    // Sem armazenamento local: só não lembra o lote
  }
}

// Trato do dia (spec 005, US2, FR-011 a FR-015): lote lembrado, quantidades
// sugeridas pela dieta × animais do lote, ajuste e confirmação; o estoque
// baixa na hora. Estoque negativo pede confirmação.
export function Fornecimento() {
  const { soConsulta } = useNutricao();
  const [lotes, setLotes] = useState<LoteResumo[]>([]);
  const [insumos, setInsumos] = useState<InsumoEstoque[]>([]);
  const [loteId, setLoteId] = useState(lerUltimoLote());
  const [data, setData] = useState(hojeLocal());
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [versao, setVersao] = useState(0);
  const [doDia, setDoDia] = useState<FornecimentoLista[]>([]);
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  useEffect(() => {
    listarLotes()
      .then((lista) => {
        setLotes(lista);
        if (lista.length > 0 && !lista.some((l) => l.id === lerUltimoLote())) setLoteId(lista[0].id);
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
    listarInsumos().then(setInsumos).catch(() => setInsumos([]));
  }, []);

  const carregar = useCallback(() => {
    if (!loteId) return;
    buscarSugestao(loteId, data)
      .then((s) => {
        setSugestao(s);
        setVersao((v) => v + 1);
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
    listarFornecimentos({ de: data, ate: data, loteId })
      .then(setDoDia)
      .catch(() => setDoDia([]));
  }, [loteId, data]);

  useEffect(carregar, [carregar]);

  async function cancelar(id: string) {
    const motivo = window.prompt('Motivo do cancelamento do trato');
    if (!motivo) return;
    try {
      await cancelarFornecimento(id, motivo);
      setAviso({ tipo: 'sucesso', texto: 'Trato cancelado; as quantidades voltaram ao estoque.' });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  return (
    <div>
      <header>
        <h1>Trato do dia</h1>
        <Link to="/modulos/nutricao/estoque">Estoque</Link>
      </header>
      {soConsulta && <Aviso tipo="atencao">Módulo desativado: só consulta · fale com o suporte para reativar</Aviso>}
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {lotes.length === 0 ? (
        <p>
          Nenhum lote de alimentação. Crie um em <Link to="/modulos/nutricao/lotes">Lotes</Link>.
        </p>
      ) : (
        <div className="ordenha-filtros">
          <label>
            Lote
            <select
              value={loteId}
              onChange={(e) => {
                setLoteId(e.target.value);
                guardarUltimoLote(e.target.value);
              }}
            >
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input type="date" value={data} max={hojeLocal()} onChange={(e) => e.target.value && setData(e.target.value)} />
          </label>
        </div>
      )}

      {sugestao && (
        <FormularioTrato
          key={`${sugestao.lote.id}-${sugestao.data}-${versao}`}
          sugestao={sugestao}
          insumos={insumos}
          soConsulta={soConsulta}
          aoGravar={(texto) => {
            setAviso({ tipo: 'sucesso', texto });
            guardarUltimoLote(sugestao.lote.id);
            carregar();
          }}
          aoErro={(texto) => setAviso({ tipo: 'erro', texto })}
        />
      )}

      {doDia.length > 0 && (
        <section>
          <h2>Tratos de {formatarData(data)}</h2>
          <ul className="lista-vacas">
            {doDia.map((f) => (
              <li key={f.id} className={`cartao-vaca${f.cancelamento.cancelado ? ' cartao-inativo' : ''}`}>
                <strong>{f.animais} animais</strong>
                {f.itens.map((i) => (
                  <span key={i.insumoId}>
                    {i.insumo}: {formatarQuantidade(i.quantidade, i.unidade)}
                  </span>
                ))}
                {f.cancelamento.cancelado ? (
                  <span>Cancelado: {f.cancelamento.motivoCancelamento}</span>
                ) : (
                  !soConsulta && (
                    <button type="button" className="botao-secundario" onClick={() => cancelar(f.id)}>
                      Cancelar trato
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

interface ItemTela {
  insumoId: string;
  insumo: string;
  unidadeId: string;
  unidade: string;
  quantidade: string;
  estoqueNaUnidade: number | null;
  silos: { id: string; nome: string }[];
  siloId: string;
}

// Itens do trato; o `key` do pai recria o formulário a cada sugestão nova
function FormularioTrato({
  sugestao,
  insumos,
  soConsulta,
  aoGravar,
  aoErro,
}: {
  sugestao: Sugestao;
  insumos: InsumoEstoque[];
  soConsulta: boolean;
  aoGravar: (texto: string) => void;
  aoErro: (texto: string) => void;
}) {
  const [itens, setItens] = useState<ItemTela[]>(
    sugestao.itens.map((i) => ({
      insumoId: i.insumoId,
      insumo: i.insumo,
      unidadeId: i.unidadeId,
      unidade: i.unidade,
      quantidade: String(i.quantidade).replace('.', ','),
      estoqueNaUnidade: i.estoqueNaUnidade,
      silos: i.silos,
      siloId: i.siloSugeridoId ?? '',
    })),
  );
  const [extraId, setExtraId] = useState('');
  const [negativo, setNegativo] = useState<string[] | null>(null);
  const [gravando, setGravando] = useState(false);

  function acrescentar() {
    const insumo = insumos.find((i) => i.id === extraId);
    if (!insumo || itens.some((i) => i.insumoId === insumo.id)) return;
    const unidade = insumo.unidades.find((u) => u.fator === 1 && u.ativa) ?? insumo.unidades.find((u) => u.ativa);
    if (!unidade) return;
    setItens([
      ...itens,
      {
        insumoId: insumo.id,
        insumo: insumo.nome,
        unidadeId: unidade.id,
        unidade: unidade.nome,
        quantidade: '',
        estoqueNaUnidade: Math.round((insumo.estoqueBase / unidade.fator) * 100) / 100,
        silos: [],
        siloId: '',
      },
    ]);
    setExtraId('');
  }

  async function gravar(evento: FormEvent, confirmarNegativo = false) {
    evento.preventDefault();
    const convertidos = itens.map((i) => ({ ...i, numero: numeroDeTexto(i.quantidade) }));
    const validos = convertidos.filter((i) => i.numero && i.numero > 0);
    if (validos.length === 0) {
      aoErro('Informe a quantidade de pelo menos um insumo.');
      return;
    }
    setGravando(true);
    try {
      const r = await gravarFornecimento({
        loteId: sugestao.lote.id,
        data: sugestao.data,
        itens: validos.map((i) => ({
          insumoId: i.insumoId,
          quantidade: i.numero!,
          unidadeId: i.unidadeId,
          siloId: i.siloId || undefined,
        })),
        confirmarNegativo,
      });
      setNegativo(null);
      aoGravar(
        `Trato de ${sugestao.lote.nome} lançado para ${r.animais} animais.` +
          (r.estoqueNegativo.length ? ` Estoque negativo: ${r.estoqueNegativo.join(', ')}.` : ''),
      );
    } catch (e) {
      if (codigoDoErro(e) === 'ESTOQUE_NEGATIVO') {
        const nomes = ((e as { response?: { data?: { insumos?: { nome: string }[] } } }).response?.data?.insumos ?? []).map(
          (i) => i.nome,
        );
        setNegativo(nomes);
      } else {
        aoErro(mensagemDeErro(e, 'Não foi possível lançar o trato.'));
      }
    } finally {
      setGravando(false);
    }
  }

  return (
    <form className="ordenha-vaca" onSubmit={(e) => gravar(e)}>
      <p className="ordenha-info">
        {sugestao.animais} {sugestao.animais === 1 ? 'animal' : 'animais'} no lote em {formatarData(sugestao.data)}
        {sugestao.dieta ? ` · dieta ${sugestao.dieta.nome}` : ' · sem dieta: lance os insumos à mão'}
      </p>
      {itens.map((item, indice) => (
        <div key={item.insumoId} className="item-trato">
          <label htmlFor={`qtd-${item.insumoId}`}>
            {item.insumo} ({item.unidade})
          </label>
          <input
            id={`qtd-${item.insumoId}`}
            className="ordenha-litros"
            inputMode="decimal"
            autoComplete="off"
            value={item.quantidade}
            disabled={soConsulta}
            onChange={(e) => setItens(itens.map((x, j) => (j === indice ? { ...x, quantidade: e.target.value } : x)))}
          />
          <span className="dica">Em estoque: {formatarQuantidade(item.estoqueNaUnidade, item.unidade)}</span>
          {item.silos.length > 0 && (
            <select
              aria-label={`Silo de onde sai ${item.insumo}`}
              value={item.siloId}
              disabled={soConsulta}
              onChange={(e) => setItens(itens.map((x, j) => (j === indice ? { ...x, siloId: e.target.value } : x)))}
            >
              {item.silos.map((s) => (
                <option key={s.id} value={s.id}>
                  Silo {s.nome}
                </option>
              ))}
              <option value="">Sem silo</option>
            </select>
          )}
          {!soConsulta && (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setItens(itens.filter((_, j) => j !== indice))}
            >
              Tirar
            </button>
          )}
        </div>
      ))}
      {!soConsulta && (
        <div className="linha-quantidade">
          <select aria-label="Acrescentar insumo" value={extraId} onChange={(e) => setExtraId(e.target.value)}>
            <option value="">Acrescentar insumo…</option>
            {insumos
              .filter((i) => !itens.some((x) => x.insumoId === i.id))
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
          </select>
          <button type="button" className="botao-secundario" onClick={acrescentar} disabled={!extraId}>
            Acrescentar
          </button>
        </div>
      )}
      {negativo && (
        <Aviso tipo="atencao">
          O estoque vai ficar negativo: {negativo.join(', ')}. Falta lançar alguma entrada? Toque em
          "Lançar mesmo assim" para gravar o trato.
        </Aviso>
      )}
      {!soConsulta && (
        <div className="ordenha-acoes">
          {negativo ? (
            <button type="button" disabled={gravando} onClick={(e) => gravar(e as unknown as FormEvent, true)}>
              Lançar mesmo assim
            </button>
          ) : (
            <button type="submit" disabled={gravando}>
              Lançar trato
            </button>
          )}
        </div>
      )}
    </form>
  );
}
