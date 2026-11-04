import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  buscarEstacao,
  cancelarEstacao,
  cancelarExposicao,
  editarEstacao,
  encerrarEstacao,
  incluirFemeas,
  listarFemeasAptas,
  type EstacaoDetalhe as Estacao,
  type FemeaApta,
} from '../../api/reproducao';
import { mensagemDeErro } from '../../api/client';
import { useAuth } from '../../contexts/useAuth';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import {
  formatarCategoria,
  formatarData,
  formatarMotivoEncerramento,
  formatarMotivoFimExposicao,
  rotuloBrinco,
} from '../../utils/formatadores';

type Painel = 'incluir' | 'encerrar' | 'editar' | 'cancelar' | null;

// US1: uma estação com as fêmeas expostas. Funcionário inclui fêmeas e encerra;
// só o dono corrige datas e cancela (FR-024, FR-026).
export function EstacaoDetalhe() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';

  const [estacao, setEstacao] = useState<Estacao | null>(null);
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [painel, setPainel] = useState<Painel>(null);

  const carregar = useCallback(() => {
    return buscarEstacao(id)
      .then(setEstacao)
      .catch((erro) => setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Estação não encontrada.') }));
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setAviso(null);
    try {
      await acao();
      setPainel(null);
      await carregar();
      setAviso({ tipo: 'sucesso', texto: sucesso });
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível salvar.') });
    }
  }

  if (!estacao) {
    return aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : <p>Carregando...</p>;
  }

  const aberta = !estacao.dataSaida && !estacao.cancelamento.cancelado;
  const ativas = estacao.exposicoes.filter((exposicao) => !exposicao.cancelamento.cancelado);

  return (
    <div>
      <header>
        <h1>
          {rotuloBrinco(estacao.touro.brinco)} no {estacao.pasto.nome}
        </h1>
        <Link to="/reproducao/estacoes">Estações</Link>
      </header>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <section>
        <p>
          <strong>
            {estacao.cancelamento.cancelado
              ? 'Cancelada'
              : aberta
                ? 'Aberta'
                : formatarMotivoEncerramento(estacao.motivoEncerramento)}
          </strong>
          {' · '}
          {estacao.dataSaida
            ? `${formatarData(estacao.dataEntrada)} a ${formatarData(estacao.dataSaida)}`
            : `desde ${formatarData(estacao.dataEntrada)}`}
          {estacao.criadoPor && ` · aberta por ${estacao.criadoPor}`}
        </p>
        {estacao.cancelamento.cancelado && (
          <p>Motivo do cancelamento: {estacao.cancelamento.motivoCancelamento}</p>
        )}
        <div className="acoes-marcacao">
          {aberta && (
            <>
              <button type="button" onClick={() => setPainel('incluir')}>
                Incluir fêmeas
              </button>
              <button type="button" onClick={() => setPainel('encerrar')}>
                Encerrar (saída do touro)
              </button>
            </>
          )}
          {ehDono && !estacao.cancelamento.cancelado && (
            <>
              <button type="button" className="botao-link" onClick={() => setPainel('editar')}>
                Corrigir datas
              </button>
              <button type="button" className="botao-link" onClick={() => setPainel('cancelar')}>
                Cancelar estação
              </button>
            </>
          )}
        </div>
      </section>

      {painel === 'incluir' && (
        <PainelIncluir
          estacao={estacao}
          aoConfirmar={(femeaIds, dataInicio) =>
            executar(
              () => incluirFemeas(id, femeaIds, dataInicio),
              `${femeaIds.length === 1 ? '1 fêmea incluída' : `${femeaIds.length} fêmeas incluídas`} na estação.`,
            )
          }
          aoFechar={() => setPainel(null)}
        />
      )}

      {painel === 'encerrar' && (
        <PainelData
          titulo="Data de saída do touro"
          minimo={estacao.dataEntrada}
          botao="Encerrar estação"
          aoConfirmar={(data) => executar(() => encerrarEstacao(id, data), 'Estação encerrada.')}
          aoFechar={() => setPainel(null)}
        />
      )}

      {painel === 'editar' && (
        <PainelEditar
          estacao={estacao}
          aoConfirmar={(dados) => executar(() => editarEstacao(id, dados), 'Datas corrigidas.')}
          aoFechar={() => setPainel(null)}
        />
      )}

      {painel === 'cancelar' && (
        <PainelMotivo
          titulo="Por que cancelar esta estação? Ela e as exposições ficam no histórico, fora dos cálculos."
          botao="Cancelar estação"
          aoConfirmar={(motivo) => executar(() => cancelarEstacao(id, motivo), 'Estação cancelada.')}
          aoFechar={() => setPainel(null)}
        />
      )}

      <section>
        <h2>Fêmeas expostas ({ativas.length})</h2>
        {estacao.exposicoes.length === 0 ? (
          <p>Nenhuma fêmea nesta estação.</p>
        ) : (
          <ul>
            {estacao.exposicoes.map((exposicao) => (
              <li key={exposicao.id} className={exposicao.cancelamento.cancelado ? 'cancelado' : undefined}>
                <Link to={`/animais/${exposicao.femea.id}`}>{rotuloBrinco(exposicao.femea.brinco)}</Link>
                {' · '}
                {formatarCategoria(exposicao.femea.categoria)}
                <br />
                <small>
                  {exposicao.dataFim
                    ? `${formatarData(exposicao.dataInicio)} a ${formatarData(exposicao.dataFim)} · ${formatarMotivoFimExposicao(exposicao.motivoFim)}`
                    : `Desde ${formatarData(exposicao.dataInicio)}`}
                  {exposicao.cancelamento.cancelado &&
                    ` · cancelada: ${exposicao.cancelamento.motivoCancelamento}`}
                </small>
                {ehDono && !exposicao.cancelamento.cancelado && !estacao.cancelamento.cancelado && (
                  <BotaoCancelarExposicao
                    aoConfirmar={(motivo) =>
                      executar(() => cancelarExposicao(exposicao.id, motivo), 'Exposição cancelada.')
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {estacao.excecoes.length > 0 && (
        <section>
          <h2>Deixadas de fora ({estacao.excecoes.length})</h2>
          <ul>
            {estacao.excecoes.map((excecao) => (
              <li key={excecao.femea.id}>
                {rotuloBrinco(excecao.femea.brinco)}: {excecao.motivo}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PainelIncluir({
  estacao,
  aoConfirmar,
  aoFechar,
}: {
  estacao: Estacao;
  aoConfirmar: (femeaIds: string[], dataInicio: string) => void;
  aoFechar: () => void;
}) {
  const [dataInicio, setDataInicio] = useState(hojeLocal);
  const [aptas, setAptas] = useState<FemeaApta[] | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const jaNaEstacao = new Set(
      estacao.exposicoes.filter((e) => !e.cancelamento.cancelado).map((e) => e.femea.id),
    );
    listarFemeasAptas({ pastoId: estacao.pasto.id, data: dataInicio })
      .then((lista) => setAptas(lista.filter((femea) => !jaNaEstacao.has(femea.id))))
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }, [estacao, dataInicio]);

  function handleConfirmar(evento: FormEvent) {
    evento.preventDefault();
    if (marcadas.length === 0) {
      setErro('Marque ao menos uma fêmea.');
      return;
    }
    aoConfirmar(marcadas, dataInicio);
  }

  return (
    <form onSubmit={handleConfirmar}>
      <div>
        <label htmlFor="inicio-inclusao">Entrou no pasto em</label>
        <input
          id="inicio-inclusao"
          type="date"
          value={dataInicio}
          min={estacao.dataEntrada}
          onChange={(e) => setDataInicio(e.target.value)}
          required
        />
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {aptas && aptas.length === 0 && <p>Nenhuma outra fêmea apta neste pasto.</p>}
      {aptas && aptas.length > 0 && (
        <ul className="lista-lote">
          {aptas.map((femea) => (
            <li key={femea.id}>
              <label>
                <input
                  type="checkbox"
                  checked={marcadas.includes(femea.id)}
                  onChange={() =>
                    setMarcadas((atuais) =>
                      atuais.includes(femea.id) ? atuais.filter((x) => x !== femea.id) : [...atuais, femea.id],
                    )
                  }
                />
                {rotuloBrinco(femea.brinco)} · {formatarCategoria(femea.categoria)}
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="acoes-marcacao">
        <button type="submit">Incluir</button>
        <button type="button" onClick={aoFechar}>
          Voltar
        </button>
      </div>
    </form>
  );
}

function PainelData({
  titulo,
  minimo,
  botao,
  aoConfirmar,
  aoFechar,
}: {
  titulo: string;
  minimo: string;
  botao: string;
  aoConfirmar: (data: string) => void;
  aoFechar: () => void;
}) {
  const [data, setData] = useState(hojeLocal);
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        aoConfirmar(data);
      }}
    >
      <div>
        <label htmlFor="data-painel">{titulo}</label>
        <input id="data-painel" type="date" value={data} min={minimo} onChange={(e) => setData(e.target.value)} required />
      </div>
      <div className="acoes-marcacao">
        <button type="submit">{botao}</button>
        <button type="button" onClick={aoFechar}>
          Voltar
        </button>
      </div>
    </form>
  );
}

function PainelEditar({
  estacao,
  aoConfirmar,
  aoFechar,
}: {
  estacao: Estacao;
  aoConfirmar: (dados: { dataEntrada?: string; dataSaida?: string }) => void;
  aoFechar: () => void;
}) {
  const [dataEntrada, setDataEntrada] = useState(estacao.dataEntrada);
  const [dataSaida, setDataSaida] = useState(estacao.dataSaida ?? '');
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        aoConfirmar({ dataEntrada, ...(estacao.dataSaida && { dataSaida }) });
      }}
    >
      <div>
        <label htmlFor="editar-entrada">Entrada do touro</label>
        <input id="editar-entrada" type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} required />
      </div>
      {estacao.dataSaida && (
        <div>
          <label htmlFor="editar-saida">Saída do touro</label>
          <input
            id="editar-saida"
            type="date"
            value={dataSaida}
            min={dataEntrada}
            onChange={(e) => setDataSaida(e.target.value)}
            required
          />
        </div>
      )}
      <div className="acoes-marcacao">
        <button type="submit">Salvar correção</button>
        <button type="button" onClick={aoFechar}>
          Voltar
        </button>
      </div>
    </form>
  );
}

function PainelMotivo({
  titulo,
  botao,
  aoConfirmar,
  aoFechar,
}: {
  titulo: string;
  botao: string;
  aoConfirmar: (motivo: string) => void;
  aoFechar: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        aoConfirmar(motivo);
      }}
    >
      <div>
        <label htmlFor="motivo-cancelamento">{titulo}</label>
        <input
          id="motivo-cancelamento"
          maxLength={200}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          required
        />
      </div>
      <div className="acoes-marcacao">
        <button type="submit">{botao}</button>
        <button type="button" onClick={aoFechar}>
          Voltar
        </button>
      </div>
    </form>
  );
}

function BotaoCancelarExposicao({ aoConfirmar }: { aoConfirmar: (motivo: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  if (!aberto) {
    return (
      <button type="button" className="botao-link" onClick={() => setAberto(true)}>
        Cancelar
      </button>
    );
  }
  return (
    <span className="cancelar-inline">
      <input
        aria-label="Motivo do cancelamento"
        placeholder="Motivo"
        maxLength={200}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />
      <button type="button" disabled={!motivo.trim()} onClick={() => aoConfirmar(motivo)}>
        Confirmar
      </button>
    </span>
  );
}
