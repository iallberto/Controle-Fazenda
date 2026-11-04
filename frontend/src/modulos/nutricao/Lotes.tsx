import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { criarLote, listarLotes, type LoteResumo } from './api';
import { useNutricao } from './NutricaoContext';

// Lotes de alimentação (spec 005, FR-010a): o dono cria; todos veem
export function Lotes() {
  const { soConsulta, ehDono } = useNutricao();
  const [lotes, setLotes] = useState<LoteResumo[] | null>(null);
  const [nome, setNome] = useState('');
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    listarLotes()
      .then(setLotes)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  useEffect(carregar, [carregar]);

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    try {
      await criarLote({ nome });
      setAviso({ tipo: 'sucesso', texto: `Lote "${nome}" criado. Abra o lote para incluir os animais.` });
      setNome('');
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  return (
    <div>
      <header>
        <h1>Lotes de alimentação</h1>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {ehDono && !soConsulta && (
        <form onSubmit={criar}>
          <label htmlFor="nome-lote">Novo lote</label>
          <input
            id="nome-lote"
            value={nome}
            maxLength={60}
            placeholder="Ex.: Vacas em lactação"
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <button type="submit">Criar lote</button>
        </form>
      )}
      {lotes && lotes.length === 0 && <p>Nenhum lote criado ainda.</p>}
      <ul className="lista-vacas">
        {lotes?.map((l) => (
          <li key={l.id}>
            <Link to={`/modulos/nutricao/lotes/${l.id}`} className="cartao-vaca">
              <strong>{l.nome}</strong>
              <span>
                {l.animais} {l.animais === 1 ? 'animal' : 'animais'} · {l.dieta ? `dieta ${l.dieta.nome}` : 'sem dieta'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
