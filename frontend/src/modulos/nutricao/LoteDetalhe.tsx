import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { listarGrupo, type AnimalDoGrupo } from '../../api/manejoLote';
import { listarPastos, type Pasto } from '../../api/pastos';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { formatarCategoria, formatarData, ROTULOS_CATEGORIA, type Categoria } from '../../utils/formatadores';
import {
  buscarLote,
  editarLote,
  incluirNoLote,
  listarDietas,
  removerDoLote,
  type Dieta,
  type LoteDetalhe as Lote,
} from './api';
import { useNutricao } from './NutricaoContext';

// Lote: animais (incluir pelo filtro de pasto e categoria do Manejo em lote,
// tirar) e, para o dono, a dieta, o nome e a desativação (spec 005, FR-010a)
export function LoteDetalhe() {
  const { id = '' } = useParams<{ id: string }>();
  const { soConsulta, ehDono } = useNutricao();
  const [lote, setLote] = useState<Lote | null>(null);
  const [dietas, setDietas] = useState<Dieta[]>([]);
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [pastoId, setPastoId] = useState('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [grupo, setGrupo] = useState<AnimalDoGrupo[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    buscarLote(id)
      .then(setLote)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, [id]);

  useEffect(() => {
    carregar();
    listarDietas().then((d) => setDietas(d.filter((x) => x.ativa))).catch(() => setDietas([]));
    listarPastos().then(setPastos).catch(() => setPastos([]));
  }, [carregar]);

  async function buscarGrupo() {
    if (!pastoId && !categoria) {
      setAviso({ tipo: 'erro', texto: 'Escolha um pasto, uma categoria ou os dois.' });
      return;
    }
    try {
      const animais = await listarGrupo({ pastoId: pastoId || undefined, categoria: categoria || undefined });
      const jaNoLote = new Set(lote?.animais.map((a) => a.animalId));
      const fora = animais.filter((a) => !jaNoLote.has(a.id));
      setGrupo(fora);
      setMarcados(new Set(fora.map((a) => a.id)));
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function incluir() {
    try {
      const r = await incluirNoLote(id, [...marcados]);
      setAviso({ tipo: 'sucesso', texto: `${r.incluidos} animal(is) incluído(s) no lote.` });
      setGrupo(null);
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function tirar(animalId: string, brinco: string) {
    try {
      await removerDoLote(id, [animalId]);
      setAviso({ tipo: 'sucesso', texto: `Brinco ${brinco} saiu do lote.` });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function mudar(dados: { dietaId?: string | null; ativo?: boolean }, texto: string) {
    try {
      await editarLote(id, dados);
      setAviso({ tipo: 'sucesso', texto });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  if (!lote) return aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : <p>Carregando...</p>;

  return (
    <div>
      <header>
        <h1>{lote.nome}</h1>
        <Link to="/modulos/nutricao/lotes">Lotes</Link>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <section>
        <label htmlFor="dieta-lote">Dieta</label>
        {ehDono && !soConsulta ? (
          <select
            id="dieta-lote"
            value={lote.dietaId ?? ''}
            onChange={(e) => mudar({ dietaId: e.target.value || null }, 'Dieta do lote trocada.')}
          >
            <option value="">Sem dieta</option>
            {dietas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        ) : (
          <p id="dieta-lote">{dietas.find((d) => d.id === lote.dietaId)?.nome ?? 'Sem dieta'}</p>
        )}
        {!lote.ativo && <p className="dica">Lote desativado.</p>}
      </section>

      {!soConsulta && lote.ativo && (
        <section>
          <h2>Incluir animais</h2>
          <label htmlFor="pasto">Pasto</label>
          <select id="pasto" value={pastoId} onChange={(e) => setPastoId(e.target.value)}>
            <option value="">Todos</option>
            {pastos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <label htmlFor="categoria">Categoria</label>
          <select id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria | '')}>
            <option value="">Todas</option>
            {(Object.keys(ROTULOS_CATEGORIA) as Categoria[]).map((c) => (
              <option key={c} value={c}>
                {ROTULOS_CATEGORIA[c]}
              </option>
            ))}
          </select>
          <button type="button" onClick={buscarGrupo}>
            Buscar animais
          </button>
          {grupo && grupo.length === 0 && <p>Nenhum animal fora do lote nesse filtro.</p>}
          {grupo && grupo.length > 0 && (
            <>
              <p className="dica">Desmarque quem não entra. Quem está em outro lote sai de lá.</p>
              <ul className="lista-vacas">
                {grupo.map((a) => (
                  <li key={a.id} className="cartao-vaca">
                    <label>
                      <input
                        type="checkbox"
                        checked={marcados.has(a.id)}
                        onChange={() => {
                          const novo = new Set(marcados);
                          if (novo.has(a.id)) novo.delete(a.id);
                          else novo.add(a.id);
                          setMarcados(novo);
                        }}
                      />
                      Brinco {a.brinco} · {formatarCategoria(a.categoria)}
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={incluir} disabled={marcados.size === 0}>
                Incluir {marcados.size} no lote
              </button>
            </>
          )}
        </section>
      )}

      <section>
        <h2>
          {lote.animais.length} {lote.animais.length === 1 ? 'animal' : 'animais'} no lote
        </h2>
        <ul className="lista-vacas">
          {lote.animais.map((a) => (
            <li key={a.animalId} className="cartao-vaca">
              <strong>Brinco {a.brinco}</strong>
              <span>
                {a.categoria ? formatarCategoria(a.categoria) : ''}
                {a.pasto && ` · ${a.pasto}`} · desde {formatarData(a.desde)}
              </span>
              {!soConsulta && (
                <button type="button" className="botao-secundario" onClick={() => tirar(a.animalId, a.brinco)}>
                  Tirar do lote
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {ehDono && !soConsulta && (
        <button
          type="button"
          className="botao-secundario"
          onClick={() => mudar({ ativo: !lote.ativo }, lote.ativo ? 'Lote desativado.' : 'Lote reativado.')}
        >
          {lote.ativo ? 'Desativar lote' : 'Reativar lote'}
        </button>
      )}
    </div>
  );
}
