import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarAnimais, type Animal } from '../../api/animais';
import { listarPastos, type Pasto } from '../../api/pastos';
import { abrirEstacao, listarFemeasAptas, type FemeaApta } from '../../api/reproducao';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import { formatarCategoria, formatarStatusReprodutivo, rotuloBrinco } from '../../utils/formatadores';

// US1: abrir a estação = colocar o touro no pasto. As fêmeas aptas do pasto vêm
// todas marcadas; quem ficar de fora precisa de motivo (mesmo jeito do Manejo em lote).
export function NovaEstacao() {
  const navigate = useNavigate();
  const [touros, setTouros] = useState<Animal[]>([]);
  const [pastos, setPastos] = useState<Pasto[]>([]);

  const [touroId, setTouroId] = useState('');
  const [pastoId, setPastoId] = useState('');
  const [dataEntrada, setDataEntrada] = useState(hojeLocal);

  const [aptas, setAptas] = useState<FemeaApta[] | null>(null);
  const [excecoes, setExcecoes] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarAnimais('TOURO')
      .then((lista) => setTouros(lista.filter((animal) => animal.status === 'ATIVO')))
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
    listarPastos().then(setPastos).catch(() => {});
  }, []);

  async function handleCarregar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    try {
      setAptas(await listarFemeasAptas({ pastoId, data: dataEntrada }));
      setExcecoes({});
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível carregar as fêmeas.'));
    }
  }

  function alternar(femeaId: string) {
    setExcecoes((atuais) => {
      const novas = { ...atuais };
      if (femeaId in novas) delete novas[femeaId];
      else novas[femeaId] = '';
      return novas;
    });
  }

  const marcadas = aptas?.filter((femea) => !(femea.id in excecoes)) ?? [];

  async function handleAbrir(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    if (marcadas.length === 0) {
      setErro('Marque ao menos uma fêmea.');
      return;
    }
    if (Object.values(excecoes).some((motivo) => !motivo.trim())) {
      setErro('Informe o motivo de cada fêmea deixada de fora.');
      return;
    }
    setEnviando(true);
    try {
      const resultado = await abrirEstacao({
        touroId,
        pastoId,
        dataEntrada,
        femeaIds: marcadas.map((femea) => femea.id),
        excecoes: Object.entries(excecoes).map(([femeaId, motivo]) => ({ femeaId, motivo })),
      });
      let aviso = `Estação aberta com ${resultado.expostas === 1 ? '1 fêmea' : `${resultado.expostas} fêmeas`}.`;
      if (resultado.excecoes > 0) {
        aviso += ` ${resultado.excecoes === 1 ? '1 ficou' : `${resultado.excecoes} ficaram`} de fora.`;
      }
      navigate(`/reproducao/estacoes/${resultado.id}`, { state: { aviso } });
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível abrir a estação.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <header>
        <h1>Nova estação de monta</h1>
      </header>

      <form onSubmit={handleCarregar}>
        <p className="passo">1. Touro e pasto</p>
        <div>
          <label htmlFor="touro">Touro</label>
          <select id="touro" value={touroId} onChange={(e) => setTouroId(e.target.value)} required>
            <option value="">Selecione o touro</option>
            {touros.map((touro) => (
              <option key={touro.id} value={touro.id}>
                {rotuloBrinco(touro.brinco)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="pasto">Pasto</label>
          <select
            id="pasto"
            value={pastoId}
            onChange={(e) => {
              setPastoId(e.target.value);
              setAptas(null);
            }}
            required
          >
            <option value="">Selecione o pasto</option>
            {pastos.map((pasto) => (
              <option key={pasto.id} value={pasto.id}>
                {pasto.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="entrada">Entrada do touro</label>
          <input
            id="entrada"
            type="date"
            value={dataEntrada}
            onChange={(e) => {
              setDataEntrada(e.target.value);
              setAptas(null);
            }}
            required
          />
        </div>
        <p className="dica">Se o touro estiver em outro pasto, ele é movido para este na data de entrada.</p>
        <button type="submit">Carregar fêmeas do pasto</button>
      </form>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {aptas && aptas.length === 0 && (
        <Aviso tipo="atencao">
          Nenhuma fêmea apta neste pasto. Entram matrizes e novilhas que não estão prenhes e que
          pariram há pelo menos 45 dias.
        </Aviso>
      )}

      {aptas && aptas.length > 0 && (
        <form onSubmit={handleAbrir} className="form-lote">
          <p className="passo">
            2. Confira as fêmeas ({marcadas.length} de {aptas.length} marcadas)
          </p>
          <ul className="lista-lote">
            {aptas.map((femea) => {
              const deFora = femea.id in excecoes;
              return (
                <li key={femea.id} className={deFora ? 'desmarcado' : undefined}>
                  <label>
                    <input type="checkbox" checked={!deFora} onChange={() => alternar(femea.id)} />
                    {rotuloBrinco(femea.brinco)} · {formatarCategoria(femea.categoria)}
                    {femea.statusReprodutivo && ` · ${formatarStatusReprodutivo(femea.statusReprodutivo)}`}
                  </label>
                  {deFora && (
                    <input
                      aria-label={`Motivo para deixar o ${rotuloBrinco(femea.brinco)} de fora`}
                      placeholder="Motivo (ex.: novilha muito nova)"
                      maxLength={200}
                      value={excecoes[femea.id]}
                      onChange={(e) => setExcecoes((atuais) => ({ ...atuais, [femea.id]: e.target.value }))}
                      required
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <button type="submit" disabled={enviando || marcadas.length === 0}>
            {enviando ? 'Abrindo...' : `Abrir estação com ${marcadas.length === 1 ? '1 fêmea' : `${marcadas.length} fêmeas`}`}
          </button>
        </form>
      )}
    </div>
  );
}
