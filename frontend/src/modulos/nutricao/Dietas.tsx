import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import {
  ativarDieta,
  formatarQuantidade,
  listarDietas,
  listarInsumos,
  numeroDeTexto,
  salvarDieta,
  type Dieta,
  type InsumoEstoque,
} from './api';
import { useNutricao } from './NutricaoContext';

interface ItemEditado {
  insumoId: string;
  quantidade: string;
  unidadeId: string;
}

// Dietas: insumos e quantidade por animal por dia (spec 005, FR-010). Só o
// dono monta; todos veem.
export function Dietas() {
  const { soConsulta, ehDono } = useNutricao();
  const [dietas, setDietas] = useState<Dieta[]>([]);
  const [insumos, setInsumos] = useState<InsumoEstoque[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState<ItemEditado[]>([]);
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    listarDietas()
      .then(setDietas)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  useEffect(() => {
    carregar();
    listarInsumos().then(setInsumos).catch(() => setInsumos([]));
  }, [carregar]);

  function abrir(dieta: Dieta | null) {
    setEditando(dieta?.id ?? 'nova');
    setNome(dieta?.nome ?? '');
    setItens(
      dieta
        ? dieta.itens.map((i) => ({
            insumoId: i.insumoId,
            quantidade: String(i.quantidadePorAnimal).replace('.', ','),
            unidadeId: i.unidadeId,
          }))
        : [{ insumoId: '', quantidade: '', unidadeId: '' }],
    );
  }

  function mudarItem(indice: number, campo: keyof ItemEditado, valor: string) {
    setItens(
      itens.map((item, i) => {
        if (i !== indice) return item;
        if (campo !== 'insumoId') return { ...item, [campo]: valor };
        const insumo = insumos.find((x) => x.id === valor);
        return { ...item, insumoId: valor, unidadeId: insumo?.unidades.find((u) => u.fator === 1)?.id ?? '' };
      }),
    );
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    const convertidos = itens
      .filter((i) => i.insumoId)
      .map((i) => ({ insumoId: i.insumoId, quantidadePorAnimal: numeroDeTexto(i.quantidade) ?? 0, unidadeId: i.unidadeId }));
    if (convertidos.some((i) => i.quantidadePorAnimal <= 0 || !i.unidadeId)) {
      setAviso({ tipo: 'erro', texto: 'Informe a quantidade e a unidade de cada insumo.' });
      return;
    }
    try {
      await salvarDieta(editando === 'nova' ? null : editando, { nome, itens: convertidos });
      setAviso({ tipo: 'sucesso', texto: `Dieta "${nome}" salva.` });
      setEditando(null);
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  const podeEditar = ehDono && !soConsulta;

  return (
    <div>
      <header>
        <h1>Dietas</h1>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {editando ? (
        <form onSubmit={salvar}>
          <label htmlFor="nome-dieta">Nome da dieta</label>
          <input id="nome-dieta" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} required />
          <h2>Por animal por dia</h2>
          {itens.map((item, i) => {
            const insumo = insumos.find((x) => x.id === item.insumoId);
            return (
              <fieldset key={i}>
                <legend>Insumo {i + 1}</legend>
                <select
                  aria-label={`Insumo ${i + 1}`}
                  value={item.insumoId}
                  onChange={(e) => mudarItem(i, 'insumoId', e.target.value)}
                >
                  <option value="">Escolha</option>
                  {insumos.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </select>
                <div className="linha-quantidade">
                  <input
                    aria-label={`Quantidade do insumo ${i + 1}`}
                    inputMode="decimal"
                    value={item.quantidade}
                    onChange={(e) => mudarItem(i, 'quantidade', e.target.value)}
                    placeholder="0,0"
                  />
                  <select
                    aria-label={`Unidade do insumo ${i + 1}`}
                    value={item.unidadeId}
                    onChange={(e) => mudarItem(i, 'unidadeId', e.target.value)}
                  >
                    {(insumo?.unidades.filter((u) => u.ativa) ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="botao-secundario" onClick={() => setItens(itens.filter((_, j) => j !== i))}>
                  Tirar
                </button>
              </fieldset>
            );
          })}
          <button
            type="button"
            className="botao-secundario"
            onClick={() => setItens([...itens, { insumoId: '', quantidade: '', unidadeId: '' }])}
          >
            Acrescentar insumo
          </button>
          <button type="submit">Salvar dieta</button>
          <button type="button" className="botao-secundario" onClick={() => setEditando(null)}>
            Cancelar
          </button>
        </form>
      ) : (
        podeEditar && (
          <button type="button" onClick={() => abrir(null)}>
            Nova dieta
          </button>
        )
      )}

      <ul className="lista-vacas">
        {dietas.map((d) => (
          <li key={d.id} className={`cartao-vaca${d.ativa ? '' : ' cartao-inativo'}`}>
            <strong>
              {d.nome}
              {!d.ativa && ' · desativada'}
            </strong>
            {d.itens.map((i) => (
              <span key={i.insumoId} className={i.insumoAtivo ? undefined : 'cartao-inativo'}>
                {i.insumo}: {formatarQuantidade(i.quantidadePorAnimal, i.unidade)} por animal
              </span>
            ))}
            <span>{d.lotes.length > 0 ? `Lotes: ${d.lotes.map((l) => l.nome).join(', ')}` : 'Nenhum lote usa'}</span>
            {podeEditar && !editando && (
              <div className="acoes-marcacao">
                <button type="button" className="botao-secundario" onClick={() => abrir(d)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="botao-secundario"
                  onClick={() => ativarDieta(d.id, !d.ativa).then(carregar).catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }))}
                >
                  {d.ativa ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
