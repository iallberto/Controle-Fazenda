import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import { formatarData, formatarMomento } from '../../utils/formatadores';
import {
  buscarFazendaCliente,
  desativarModulo,
  liberarModulo,
  NOMES_MODULOS,
  reativarFazenda,
  suspenderFazenda,
  type FazendaClienteDetalhe,
  type ModuloPago,
} from './api';
import { SeloModulo } from './SeloModulo';

// Uma fazenda cliente: liberar e desativar módulos, suspender e reativar,
// com o histórico de quem fez cada ação (FR-020, FR-023, FR-025).
export function AdminFazendaDetalhe() {
  const { id = '' } = useParams<{ id: string }>();
  const [fazenda, setFazenda] = useState<FazendaClienteDetalhe | null>(null);
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const [modulo, setModulo] = useState<ModuloPago>('FINANCEIRO');
  const [dataInicio, setDataInicio] = useState(hojeLocal);
  const [dataTermino, setDataTermino] = useState('');
  const [motivo, setMotivo] = useState('');
  const [confirmarDesativar, setConfirmarDesativar] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    buscarFazendaCliente(id)
      .then((dados) => {
        setFazenda(dados);
        document.title = `${dados.nome} · Painel do administrador`;
      })
      .catch((erro) => setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) }));
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(acao: () => Promise<void>, sucesso: string) {
    setAviso(null);
    setEnviando(true);
    try {
      await acao();
      setAviso({ tipo: 'sucesso', texto: sucesso });
      carregar();
      return true;
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) });
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function handleLiberar(evento: FormEvent) {
    evento.preventDefault();
    const ok = await executar(
      () => liberarModulo(id, { modulo, dataInicio, dataTermino: dataTermino || undefined }),
      `Módulo ${NOMES_MODULOS[modulo]} liberado${dataTermino ? ` até ${formatarData(dataTermino)}` : ''}.`,
    );
    if (ok) setDataTermino('');
  }

  async function handleSuspender(evento: FormEvent) {
    evento.preventDefault();
    const ok = await executar(
      () => suspenderFazenda(id, motivo),
      'Fazenda suspensa. Ninguém dela consegue entrar até a reativação.',
    );
    if (ok) setMotivo('');
  }

  if (!fazenda) {
    return aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : <p>Carregando...</p>;
  }

  const periodosAbertos = fazenda.periodos.filter((p) => !p.desativadoEm);

  return (
    <div>
      <header>
        <h1>{fazenda.nome}</h1>
        <Link to="/admin">Todas as fazendas</Link>
      </header>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <section>
        <p>
          Cliente desde {formatarMomento(fazenda.criadaEm)} ·{' '}
          {fazenda.usuariosAtivos === 1 ? '1 usuário ativo' : `${fazenda.usuariosAtivos} usuários ativos`}
          {fazenda.suspensa && (
            <>
              {' '}
              · <span className="selo selo-suspensa">Suspensa</span>
            </>
          )}
        </p>
        <div className="selos">
          {fazenda.modulos.map((item) => (
            <SeloModulo key={item.modulo} modulo={item} />
          ))}
        </div>
      </section>

      <section>
        <h2>Liberar módulo</h2>
        <form onSubmit={handleLiberar}>
          <div>
            <label htmlFor="modulo">Módulo</label>
            <select id="modulo" value={modulo} onChange={(e) => setModulo(e.target.value as ModuloPago)}>
              {(Object.keys(NOMES_MODULOS) as ModuloPago[]).map((chave) => (
                <option key={chave} value={chave}>
                  {NOMES_MODULOS[chave]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="data-inicio">Início</label>
            <input
              id="data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="data-termino">Término (só para contrato com prazo)</label>
            <input
              id="data-termino"
              type="date"
              value={dataTermino}
              min={dataInicio}
              onChange={(e) => setDataTermino(e.target.value)}
            />
          </div>
          <button type="submit" disabled={enviando}>
            Liberar
          </button>
        </form>
      </section>

      <section>
        <h2>Liberações ({fazenda.periodos.length})</h2>
        {fazenda.periodos.length === 0 && <p>Nenhum módulo liberado ainda.</p>}
        <ul>
          {fazenda.periodos.map((periodo) => (
            <li key={periodo.id} className={periodo.desativadoEm ? 'cancelado' : undefined}>
              <strong>{NOMES_MODULOS[periodo.modulo]}</strong> · de {formatarData(periodo.dataInicio)}
              {periodo.dataTermino ? ` até ${formatarData(periodo.dataTermino)}` : ', sem término'}
              <br />
              <small>
                liberado por {periodo.liberadoPor ?? '—'} em {formatarMomento(periodo.liberadoEm)}
                {periodo.desativadoEm &&
                  ` · desativado por ${periodo.desativadoPor ?? '—'} em ${formatarMomento(periodo.desativadoEm)}`}
              </small>
              {!periodo.desativadoEm &&
                periodosAbertos.includes(periodo) &&
                (confirmarDesativar === periodo.id ? (
                  <span className="cancelar-inline">
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={async () => {
                        await executar(
                          () => desativarModulo(periodo.id),
                          `Módulo ${NOMES_MODULOS[periodo.modulo]} desativado. A fazenda continua só consultando.`,
                        );
                        setConfirmarDesativar(null);
                      }}
                    >
                      Confirmar desativação
                    </button>
                    <button type="button" className="botao-link" onClick={() => setConfirmarDesativar(null)}>
                      Voltar
                    </button>
                  </span>
                ) : (
                  <>
                    {' '}
                    <button
                      type="button"
                      className="botao-link"
                      onClick={() => setConfirmarDesativar(periodo.id)}
                    >
                      Desativar
                    </button>
                  </>
                ))}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Suspensão da fazenda</h2>
        {fazenda.suspensa ? (
          <>
            <p>
              Fazenda suspensa: ninguém dela entra no sistema, e a página pública dos animais mostra só o
              básico.
            </p>
            <button
              type="button"
              disabled={enviando}
              onClick={() =>
                executar(() => reativarFazenda(id), 'Fazenda reativada. Os usuários já podem entrar.')
              }
            >
              Reativar fazenda
            </button>
          </>
        ) : (
          <form onSubmit={handleSuspender}>
            <div>
              <label htmlFor="motivo-suspensao">Motivo da suspensão</label>
              <input
                id="motivo-suspensao"
                maxLength={200}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={enviando || !motivo.trim()}>
              Suspender fazenda
            </button>
          </form>
        )}
        {fazenda.suspensoes.length > 0 && (
          <ul>
            {fazenda.suspensoes.map((suspensao) => (
              <li key={suspensao.id}>
                Suspensa em {formatarMomento(suspensao.suspensaEm)} por {suspensao.suspensaPor ?? '—'}:{' '}
                {suspensao.motivo}
                {suspensao.reativadaEm &&
                  ` · reativada em ${formatarMomento(suspensao.reativadaEm)} por ${suspensao.reativadaPor ?? '—'}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
