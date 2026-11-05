import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { centavosDeTexto, formatarData, formatarReais } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import {
  abrirSilo,
  cancelarAberturaSilo,
  criarSilo,
  encerrarSilo,
  formatarQuantidade,
  listarInsumos,
  listarSilos,
  numeroDeTexto,
  ROTULOS_SILO,
  type InsumoEstoque,
  type SiloLista,
  type TipoSilo,
} from './api';
import { useNutricao } from './NutricaoContext';

const toneladas = (kg: number) => formatarQuantidade(Math.round(kg / 10) / 100, 't');

// Silos (spec 005, US3): saldo, consumo médio e previsão de duração; o dono
// cadastra e encerra; dono e funcionário abrem
export function Silos() {
  const { soConsulta, ehDono } = useNutricao();
  const [silos, setSilos] = useState<SiloLista[]>([]);
  const [insumos, setInsumos] = useState<InsumoEstoque[]>([]);
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'TRINCHEIRA' as TipoSilo, insumoId: '', toneladas: '', fechamento: hojeLocal(), custo: '' });

  const carregar = useCallback(() => {
    listarSilos()
      .then(setSilos)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  useEffect(() => {
    carregar();
    listarInsumos().then((l) => setInsumos(l.filter((i) => i.tipo === 'SILAGEM'))).catch(() => setInsumos([]));
  }, [carregar]);

  async function acao(fazer: () => Promise<unknown>, texto: string) {
    try {
      await fazer();
      setAviso({ tipo: 'sucesso', texto });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  function cadastrar(evento: FormEvent) {
    evento.preventDefault();
    const t = numeroDeTexto(form.toneladas);
    if (!t || t <= 0) {
      setAviso({ tipo: 'erro', texto: 'Informe as toneladas ensiladas.' });
      return;
    }
    acao(
      () =>
        criarSilo({
          nome: form.nome,
          tipo: form.tipo,
          insumoId: form.insumoId,
          toneladasEnsiladas: t,
          fechamento: form.fechamento,
          custoEnsilagemCentavos: form.custo ? (centavosDeTexto(form.custo) ?? undefined) : undefined,
        }),
      `Silo "${form.nome}" cadastrado.`,
    ).then(() => setNovo(false));
  }

  return (
    <div>
      <header>
        <h1>Silos</h1>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {ehDono && !soConsulta && !novo && (
        <button type="button" onClick={() => setNovo(true)}>
          Cadastrar silo
        </button>
      )}
      {novo && (
        <form onSubmit={cadastrar}>
          {insumos.length === 0 && (
            <p className="dica">Cadastre antes um insumo do tipo silagem, no estoque.</p>
          )}
          <label htmlFor="silo-nome">Nome</label>
          <input id="silo-nome" value={form.nome} maxLength={60} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <label htmlFor="silo-tipo">Tipo</label>
          <select id="silo-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoSilo })}>
            {(Object.keys(ROTULOS_SILO) as TipoSilo[]).map((t) => (
              <option key={t} value={t}>
                {ROTULOS_SILO[t]}
              </option>
            ))}
          </select>
          <label htmlFor="silo-insumo">Silagem</label>
          <select id="silo-insumo" value={form.insumoId} onChange={(e) => setForm({ ...form, insumoId: e.target.value })} required>
            <option value="">Escolha</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
          <label htmlFor="silo-ton">Toneladas ensiladas (estimativa)</label>
          <input id="silo-ton" inputMode="decimal" value={form.toneladas} onChange={(e) => setForm({ ...form, toneladas: e.target.value })} required />
          <label htmlFor="silo-fech">Data de fechamento</label>
          <input id="silo-fech" type="date" max={hojeLocal()} value={form.fechamento} onChange={(e) => setForm({ ...form, fechamento: e.target.value })} required />
          <label htmlFor="silo-custo">Custo da ensilagem (opcional)</label>
          <input id="silo-custo" inputMode="decimal" placeholder="R$ 0,00" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
          <button type="submit">Cadastrar</button>
          <button type="button" className="botao-secundario" onClick={() => setNovo(false)}>
            Cancelar
          </button>
        </form>
      )}

      {silos.length === 0 && <p>Nenhum silo cadastrado.</p>}
      <ul className="lista-vacas">
        {silos.map((s) => (
          <li key={s.id} className={`cartao-vaca${s.situacao === 'ENCERRADO' ? ' cartao-inativo' : ''}`}>
            <strong>
              {s.nome} · {ROTULOS_SILO[s.tipo]}
            </strong>
            <span>
              {s.situacao === 'FECHADO' && `Fechado em ${formatarData(s.fechamento)} · reserva de ${toneladas(s.saldoKg)}`}
              {s.situacao === 'ABERTO' && `Aberto em ${formatarData(s.abertura)}`}
              {s.situacao === 'ENCERRADO' && `Encerrado em ${formatarData(s.encerramento)}`}
            </span>
            {s.situacao !== 'FECHADO' && (
              <>
                <span>
                  Ensilado {toneladas(s.toneladasEnsiladas * 1000)} · consumido {toneladas(s.consumidoKg)} · saldo{' '}
                  <span className={s.saldoKg < 0 ? 'texto-descarte' : undefined}>{toneladas(s.saldoKg)}</span>
                </span>
                {s.situacao === 'ABERTO' && (
                  <span>
                    {s.mediaKgDia === null
                      ? 'Sem consumo registrado'
                      : `Consumo médio ${toneladas(s.mediaKgDia)}/dia` +
                        (s.diasRestantes !== null ? ` · dura mais ${s.diasRestantes} dias, até ${formatarData(s.acabaEm)}` : '')}
                  </span>
                )}
              </>
            )}
            {ehDono && s.custoEnsilagemCentavos != null && <span>Custo da ensilagem: {formatarReais(s.custoEnsilagemCentavos)}</span>}
            {!soConsulta && (
              <div className="acoes-marcacao">
                {s.situacao === 'FECHADO' && (
                  <button type="button" onClick={() => acao(() => abrirSilo(s.id, hojeLocal()), `Silo "${s.nome}" aberto: a silagem entrou no estoque.`)}>
                    Abrir hoje
                  </button>
                )}
                {s.situacao === 'ABERTO' && (
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => {
                      const motivo = window.prompt('Motivo do cancelamento da abertura');
                      if (motivo) acao(() => cancelarAberturaSilo(s.id, motivo), 'Abertura cancelada.');
                    }}
                  >
                    Cancelar abertura
                  </button>
                )}
                {s.situacao === 'ABERTO' && ehDono && (
                  <button type="button" className="botao-secundario" onClick={() => acao(() => encerrarSilo(s.id, hojeLocal()), 'Silo encerrado.')}>
                    Encerrar (acabou)
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
