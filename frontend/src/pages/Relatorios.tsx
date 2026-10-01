import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  buscarNascimentos,
  buscarNatimortos,
  buscarObitosPorCausa,
  buscarTratamentosPorPeriodo,
  type NascimentoOuNatimorto,
  type ObitoPorCausa,
  type TratamentoRelatorio,
} from '../api/relatorios';

export function Relatorios() {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [carregando, setCarregando] = useState(false);

  const [nascimentos, setNascimentos] = useState<NascimentoOuNatimorto[]>([]);
  const [natimortos, setNatimortos] = useState<NascimentoOuNatimorto[]>([]);
  const [obitosPorCausa, setObitosPorCausa] = useState<ObitoPorCausa[]>([]);
  const [tratamentos, setTratamentos] = useState<TratamentoRelatorio[]>([]);

  async function handleGerar(evento: FormEvent) {
    evento.preventDefault();
    setCarregando(true);

    const [resNascimentos, resNatimortos, resObitos, resTratamentos] = await Promise.all([
      buscarNascimentos(inicio, fim),
      buscarNatimortos(inicio, fim),
      buscarObitosPorCausa(inicio, fim),
      buscarTratamentosPorPeriodo(inicio, fim),
    ]);

    setNascimentos(resNascimentos);
    setNatimortos(resNatimortos);
    setObitosPorCausa(resObitos);
    setTratamentos(resTratamentos);
    setCarregando(false);
  }

  return (
    <div>
      <header>
        <h1>Relatórios</h1>
        <Link to="/">Voltar ao painel</Link>
      </header>

      <form onSubmit={handleGerar}>
        <label htmlFor="inicio">De</label>
        <input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        <label htmlFor="fim">Até</label>
        <input id="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} required />
        <button type="submit">Gerar relatórios</button>
      </form>

      {carregando && <p>Carregando...</p>}

      {!carregando && (
        <>
          <section>
            <h2>Nascimentos ({nascimentos.length})</h2>
            <ul>
              {nascimentos.map((parto) => (
                <li key={parto.id}>
                  {parto.data} — {parto.crias?.length ?? 0} cria(s)
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Natimortos ({natimortos.length})</h2>
            <ul>
              {natimortos.map((parto) => (
                <li key={parto.id}>{parto.data}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Óbitos por causa</h2>
            <ul>
              {obitosPorCausa.map((item) => (
                <li key={item.motivo}>
                  {item.motivo}: {item.total}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Tratamentos ({tratamentos.length})</h2>
            <ul>
              {tratamentos.map((t) => (
                <li key={t.id}>
                  {t.data} — {t.produto} ({t.responsavel})
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}