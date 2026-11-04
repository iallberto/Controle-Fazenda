import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listarPastos, type Pasto } from '../../api/pastos';
import { listarAplicadores, type Aplicador } from '../../api/usuarios';
import { listarVeterinarios, type Veterinario } from '../../api/veterinarios';
import {
  listarGrupoDiagnostico,
  registrarDiagnosticoLote,
  type FemeaDoGrupo,
  type MetodoDiagnostico,
} from '../../api/reproducao';
import { mensagemDeErro } from '../../api/client';
import { useAuth } from '../../contexts/useAuth';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import {
  ROTULOS_CATEGORIA,
  formatarCategoria,
  formatarData,
  formatarResultadoDiagnostico,
  idadeGestacionalEmDias,
  rotuloBrinco,
  type Categoria,
} from '../../utils/formatadores';

interface Marcacao {
  resultado: 'PRENHE' | 'VAZIA';
  meses: string;
  dias: string;
}

// US2: diagnóstico do grupo inteiro de uma vez. Cada fêmea recebe Prenhe ou Vazia
// com um toque; quem não for marcada não é diagnosticada agora.
export function DiagnosticoLote() {
  const { usuario } = useAuth();
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [aplicadores, setAplicadores] = useState<Aplicador[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);

  const [pastoId, setPastoId] = useState('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [grupo, setGrupo] = useState<{ pastoId: string; categoria: Categoria | '' } | null>(null);
  const [femeas, setFemeas] = useState<FemeaDoGrupo[] | null>(null);
  const [marcacoes, setMarcacoes] = useState<Record<string, Marcacao>>({});

  const [data, setData] = useState(hojeLocal);
  const [metodo, setMetodo] = useState<MetodoDiagnostico>('TOQUE');
  const [feitoPorTipo, setFeitoPorTipo] = useState<'USUARIO' | 'VETERINARIO'>('USUARIO');
  const [feitoPorUsuarioId, setFeitoPorUsuarioId] = useState(usuario?.id ?? '');
  const [feitoPorVeterinarioId, setFeitoPorVeterinarioId] = useState('');

  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarPastos().then(setPastos).catch(() => {});
    listarAplicadores().then(setAplicadores).catch(() => {});
    listarVeterinarios()
      .then((lista) => setVeterinarios(lista.filter((v) => v.ativo)))
      .catch(() => {});
  }, []);

  async function handleCarregar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    try {
      setFemeas(
        await listarGrupoDiagnostico({ pastoId: pastoId || undefined, categoria: categoria || undefined }),
      );
      setMarcacoes({});
      setGrupo({ pastoId, categoria });
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível carregar as fêmeas.') });
    }
  }

  function marcar(femeaId: string, resultado: 'PRENHE' | 'VAZIA') {
    setMarcacoes((atuais) => {
      const novas = { ...atuais };
      // Tocar de novo no mesmo botão desfaz a marcação
      if (novas[femeaId]?.resultado === resultado) delete novas[femeaId];
      else novas[femeaId] = { resultado, meses: novas[femeaId]?.meses ?? '', dias: novas[femeaId]?.dias ?? '' };
      return novas;
    });
  }

  function alterarIdade(femeaId: string, campo: 'meses' | 'dias', valor: string) {
    setMarcacoes((atuais) => ({ ...atuais, [femeaId]: { ...atuais[femeaId], [campo]: valor } }));
  }

  const marcadas = Object.entries(marcacoes);

  async function handleSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!grupo || marcadas.length === 0) return;
    setAviso(null);
    setEnviando(true);
    try {
      const resultado = await registrarDiagnosticoLote({
        pastoId: grupo.pastoId || undefined,
        categoria: grupo.categoria || undefined,
        data,
        metodo,
        feitoPorTipo,
        feitoPorUsuarioId: feitoPorTipo === 'USUARIO' ? feitoPorUsuarioId : undefined,
        feitoPorVeterinarioId: feitoPorTipo === 'VETERINARIO' ? feitoPorVeterinarioId : undefined,
        resultados: marcadas.map(([femeaId, marcacao]) => {
          const meses = Number(marcacao.meses) || 0;
          const dias = Number(marcacao.dias) || 0;
          const idade = idadeGestacionalEmDias(meses, dias);
          return {
            femeaId,
            resultado: marcacao.resultado,
            idadeGestacionalDias: marcacao.resultado === 'PRENHE' && idade > 0 ? idade : undefined,
          };
        }),
      });
      const partes = [
        resultado.prenhes === 1 ? '1 prenhe' : `${resultado.prenhes} prenhes`,
        resultado.vazias === 1 ? '1 vazia' : `${resultado.vazias} vazias`,
      ];
      setAviso({ tipo: 'sucesso', texto: `Diagnóstico registrado: ${partes.join(' e ')}.` });
      setFemeas(null);
      setMarcacoes({});
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível registrar o diagnóstico.') });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <header>
        <h1>Diagnóstico de gestação</h1>
        <Link to="/reproducao/estacoes">Estações de monta</Link>
      </header>

      <form onSubmit={handleCarregar}>
        <p className="passo">1. Escolha o grupo</p>
        <div>
          <label htmlFor="pasto">Pasto</label>
          <select id="pasto" value={pastoId} onChange={(e) => setPastoId(e.target.value)}>
            <option value="">Todos os pastos</option>
            {pastos.map((pasto) => (
              <option key={pasto.id} value={pasto.id}>
                {pasto.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="categoria">Categoria</label>
          <select id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria | '')}>
            <option value="">Matrizes e novilhas</option>
            {(['MATRIZ', 'NOVILHA'] as Categoria[]).map((item) => (
              <option key={item} value={item}>
                {ROTULOS_CATEGORIA[item]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={!pastoId && !categoria}>
          Carregar fêmeas
        </button>
      </form>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {femeas && femeas.length === 0 && <Aviso tipo="atencao">Nenhuma fêmea ativa nesse grupo.</Aviso>}

      {femeas && femeas.length > 0 && (
        <form onSubmit={handleSalvar} className="form-lote">
          <p className="passo">2. Data, método e quem fez</p>
          <div>
            <label htmlFor="data">Data do diagnóstico</label>
            <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="metodo">Método</label>
            <select id="metodo" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoDiagnostico)}>
              <option value="TOQUE">Toque</option>
              <option value="ULTRASSOM">Ultrassom</option>
            </select>
          </div>
          <div>
            <label htmlFor="feito-por-tipo">Feito por</label>
            <select
              id="feito-por-tipo"
              value={feitoPorTipo}
              onChange={(e) => setFeitoPorTipo(e.target.value as 'USUARIO' | 'VETERINARIO')}
            >
              <option value="USUARIO">Funcionário / Dono</option>
              <option value="VETERINARIO">Veterinário</option>
            </select>
          </div>
          {feitoPorTipo === 'USUARIO' ? (
            <div>
              <label htmlFor="feito-por">Quem fez</label>
              <select id="feito-por" value={feitoPorUsuarioId} onChange={(e) => setFeitoPorUsuarioId(e.target.value)} required>
                <option value="">Selecione</option>
                {aplicadores.map((aplicador) => (
                  <option key={aplicador.id} value={aplicador.id}>
                    {aplicador.nome}
                    {aplicador.papel === 'DONO' ? ' (dono)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="veterinario">Qual veterinário</label>
              <select
                id="veterinario"
                value={feitoPorVeterinarioId}
                onChange={(e) => setFeitoPorVeterinarioId(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {veterinarios.map((veterinario) => (
                  <option key={veterinario.id} value={veterinario.id}>
                    {veterinario.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="passo">3. Resultado de cada fêmea ({marcadas.length} de {femeas.length})</p>
          <ul className="lista-diagnostico">
            {femeas.map((femea) => {
              const marcacao = marcacoes[femea.id];
              return (
                <li key={femea.id}>
                  <div className="diagnostico-cabecalho">
                    <span>
                      <strong>{rotuloBrinco(femea.brinco)}</strong> · {formatarCategoria(femea.categoria)}
                      {femea.ultimoDiagnostico && (
                        <small>
                          {' '}
                          · último: {formatarResultadoDiagnostico(femea.ultimoDiagnostico.resultado)} em{' '}
                          {formatarData(femea.ultimoDiagnostico.data)}
                        </small>
                      )}
                    </span>
                    <span className="botoes-resultado">
                      <button
                        type="button"
                        className={marcacao?.resultado === 'PRENHE' ? 'resultado ativo-prenhe' : 'resultado'}
                        aria-pressed={marcacao?.resultado === 'PRENHE'}
                        onClick={() => marcar(femea.id, 'PRENHE')}
                      >
                        Prenhe
                      </button>
                      <button
                        type="button"
                        className={marcacao?.resultado === 'VAZIA' ? 'resultado ativo-vazia' : 'resultado'}
                        aria-pressed={marcacao?.resultado === 'VAZIA'}
                        onClick={() => marcar(femea.id, 'VAZIA')}
                      >
                        Vazia
                      </button>
                    </span>
                  </div>
                  {marcacao?.resultado === 'PRENHE' && (
                    <div className="idade-gestacional">
                      <span>Idade da prenhez (opcional):</span>
                      <input
                        aria-label={`Meses de prenhez do ${rotuloBrinco(femea.brinco)}`}
                        type="number"
                        min={0}
                        max={10}
                        inputMode="numeric"
                        placeholder="meses"
                        value={marcacao.meses}
                        onChange={(e) => alterarIdade(femea.id, 'meses', e.target.value)}
                      />
                      <span>meses e</span>
                      <input
                        aria-label={`Dias de prenhez do ${rotuloBrinco(femea.brinco)}`}
                        type="number"
                        min={0}
                        max={29}
                        inputMode="numeric"
                        placeholder="dias"
                        value={marcacao.dias}
                        onChange={(e) => alterarIdade(femea.id, 'dias', e.target.value)}
                      />
                      <span>dias</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <button type="submit" disabled={enviando || marcadas.length === 0}>
            {enviando
              ? 'Salvando...'
              : `Registrar ${marcadas.length === 1 ? '1 diagnóstico' : `${marcadas.length} diagnósticos`}`}
          </button>
        </form>
      )}
    </div>
  );
}
