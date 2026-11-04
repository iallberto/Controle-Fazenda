import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { formatarData } from '../../utils/formatadores';
import { mesAtual, nomeCurtoDoMes, somarMeses } from '../../utils/meses';
import { cancelarAnalise, criarAnalise, listarAnalises, type AnaliseLeite } from './api';
import { useLeite } from './LeiteContext';

const numero = (texto: string) => {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '') return undefined;
  const valor = Number(limpo);
  return Number.isFinite(valor) ? valor : undefined;
};

const mostrar = (valor: number | null, sufixo = '') =>
  valor === null ? '—' : `${valor.toLocaleString('pt-BR')}${sufixo}`;

// Análises do laticínio mês a mês (spec 004, FR-024): CCS e CBT em mil por mL,
// gordura e proteína em %
export function Analises() {
  const { soConsulta } = useLeite();
  const [analises, setAnalises] = useState<AnaliseLeite[]>([]);
  const [mes, setMes] = useState(somarMeses(mesAtual(), -1));
  const [ccs, setCcs] = useState('');
  const [cbt, setCbt] = useState('');
  const [gordura, setGordura] = useState('');
  const [proteina, setProteina] = useState('');
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    listarAnalises()
      .then(setAnalises)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  useEffect(carregar, [carregar]);

  async function lancar(evento: FormEvent) {
    evento.preventDefault();
    try {
      await criarAnalise({
        mes,
        ccsMil: numero(ccs),
        cbtMil: numero(cbt),
        gordura: numero(gordura),
        proteina: numero(proteina),
      });
      setAviso({ tipo: 'sucesso', texto: 'Análise lançada.' });
      setCcs('');
      setCbt('');
      setGordura('');
      setProteina('');
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function cancelar(id: string) {
    const motivo = window.prompt('Motivo do cancelamento da análise');
    if (!motivo) return;
    try {
      await cancelarAnalise(id, motivo);
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  return (
    <div>
      <header>
        <h1>Análises do laticínio</h1>
        <Link to="/modulos/leite/entregas">Entregas</Link>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {!soConsulta && (
        <form onSubmit={lancar}>
          <h2>Nova análise</h2>
          <label htmlFor="mes-analise">Mês</label>
          <input
            id="mes-analise"
            type="month"
            value={mes}
            max={mesAtual()}
            onChange={(e) => setMes(e.target.value)}
            required
          />
          <label htmlFor="ccs">CCS (mil células/mL)</label>
          <input id="ccs" inputMode="numeric" value={ccs} onChange={(e) => setCcs(e.target.value)} />
          <label htmlFor="cbt">CBT (mil UFC/mL)</label>
          <input id="cbt" inputMode="numeric" value={cbt} onChange={(e) => setCbt(e.target.value)} />
          <label htmlFor="gordura">Gordura (%)</label>
          <input id="gordura" inputMode="decimal" value={gordura} onChange={(e) => setGordura(e.target.value)} />
          <label htmlFor="proteina">Proteína (%)</label>
          <input id="proteina" inputMode="decimal" value={proteina} onChange={(e) => setProteina(e.target.value)} />
          <button type="submit">Lançar análise</button>
        </form>
      )}

      <section>
        <h2>Histórico</h2>
        {analises.length === 0 ? (
          <p>Nenhuma análise nos últimos 12 meses.</p>
        ) : (
          <div className="tabela-rolavel">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>CCS</th>
                  <th>CBT</th>
                  <th>Gord.</th>
                  <th>Prot.</th>
                  {!soConsulta && <th />}
                </tr>
              </thead>
              <tbody>
                {analises.map((a) => (
                  <tr key={a.id} className={a.cancelamento.cancelado ? 'linha-descarte' : undefined}>
                    <td>
                      {nomeCurtoDoMes(a.mes)}
                      {a.entrega && ` (${formatarData(a.entrega.data)})`}
                      {a.cancelamento.cancelado && ' · cancelada'}
                    </td>
                    <td>{mostrar(a.ccsMil)}</td>
                    <td>{mostrar(a.cbtMil)}</td>
                    <td>{mostrar(a.gordura, '%')}</td>
                    <td>{mostrar(a.proteina, '%')}</td>
                    {!soConsulta && (
                      <td>
                        {!a.cancelamento.cancelado && (
                          <button type="button" className="botao-secundario" onClick={() => cancelar(a.id)}>
                            Cancelar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
