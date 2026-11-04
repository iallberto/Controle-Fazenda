import { useProdutoComCarencia } from '../modulos/leite/useProdutoComCarencia';
import { useEffect, useState, type FormEvent } from 'react';
import { listarPastos, type Pasto } from '../api/pastos';
import { listarAplicadores, type Aplicador } from '../api/usuarios';
import { listarVeterinarios, type Veterinario } from '../api/veterinarios';
import {
  aplicarTratamentoEmLote,
  listarGrupo,
  listarSessoes,
  moverPastoEmLote,
  type AnimalDoGrupo,
  type SessaoManejo,
} from '../api/manejoLote';
import { mensagemDeErro } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { Aviso, type EstadoAviso } from '../components/Aviso';
import { hojeLocal } from '../utils/datas';
import {
  ROTULOS_CATEGORIA,
  formatarCategoria,
  formatarData,
  rotuloBrinco,
  type Categoria,
} from '../utils/formatadores';

type Acao = 'TRATAMENTO' | 'PASTO';

// M4: escolher o grupo, conferir quem entra (todos marcados, exceções com motivo)
// e aplicar o tratamento ou a mudança de pasto de uma vez.
export function ManejoLote() {
  const produtoLeite = useProdutoComCarencia();
  const { usuario } = useAuth();
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [aplicadores, setAplicadores] = useState<Aplicador[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [sessoes, setSessoes] = useState<SessaoManejo[]>([]);

  // 1. Grupo
  const [pastoId, setPastoId] = useState('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [animais, setAnimais] = useState<AnimalDoGrupo[] | null>(null);
  const [grupoCarregado, setGrupoCarregado] = useState<{ pastoId: string; categoria: Categoria | '' }>();

  // 2. Conferência: desmarcados ficam aqui, com o motivo
  const [excecoes, setExcecoes] = useState<Record<string, string>>({});

  // 3. Ação
  const [acao, setAcao] = useState<Acao>('TRATAMENTO');
  const [produto, setProduto] = useState('');
  const [data, setData] = useState(hojeLocal);
  const [temRecorrencia, setTemRecorrencia] = useState(false);
  const [recorrenciaDias, setRecorrenciaDias] = useState('');
  const [aplicadoPorTipo, setAplicadoPorTipo] = useState<'USUARIO' | 'VETERINARIO'>('USUARIO');
  const [aplicadoPorUsuarioId, setAplicadoPorUsuarioId] = useState(usuario?.id ?? '');
  const [aplicadoPorVeterinarioId, setAplicadoPorVeterinarioId] = useState('');
  const [pastoDestinoId, setPastoDestinoId] = useState('');

  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarPastos().then(setPastos).catch(() => {});
    listarAplicadores().then(setAplicadores).catch(() => {});
    listarVeterinarios()
      .then((lista) => setVeterinarios(lista.filter((v) => v.ativo)))
      .catch(() => {});
    listarSessoes().then(setSessoes).catch(() => {});
  }, []);

  async function handleCarregar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    try {
      const lista = await listarGrupo({
        pastoId: pastoId || undefined,
        categoria: categoria || undefined,
      });
      setAnimais(lista);
      setExcecoes({});
      setGrupoCarregado({ pastoId, categoria });
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível carregar os animais.') });
    }
  }

  function alternar(animalId: string) {
    setExcecoes((atuais) => {
      const novas = { ...atuais };
      if (animalId in novas) delete novas[animalId];
      else novas[animalId] = '';
      return novas;
    });
  }

  function marcarTodos(marcar: boolean) {
    if (!animais) return;
    setExcecoes(marcar ? {} : Object.fromEntries(animais.map((animal) => [animal.id, ''])));
  }

  const marcados = animais?.filter((animal) => !(animal.id in excecoes)) ?? [];
  const semMotivo = Object.values(excecoes).some((motivo) => !motivo.trim());

  async function handleAplicar(evento: FormEvent) {
    evento.preventDefault();
    if (!animais || !grupoCarregado) return;
    setAviso(null);

    if (marcados.length === 0) {
      setAviso({ tipo: 'erro', texto: 'Marque ao menos um animal.' });
      return;
    }
    if (semMotivo) {
      setAviso({ tipo: 'erro', texto: 'Informe o motivo de cada animal desmarcado.' });
      return;
    }

    const selecao = {
      pastoId: grupoCarregado.pastoId || undefined,
      categoria: grupoCarregado.categoria || undefined,
      animalIds: marcados.map((animal) => animal.id),
      excecoes: Object.entries(excecoes).map(([animalId, motivo]) => ({ animalId, motivo })),
    };

    // Com o Leite ativo, produto sem cadastro abre o cadastro rápido e repete (spec 004)
    const executar = async () => {
      let texto: string;
      if (acao === 'TRATAMENTO') {
        const resultado = await aplicarTratamentoEmLote({
          ...selecao,
          produto,
          data,
          recorrenciaDias: temRecorrencia ? Number(recorrenciaDias) : undefined,
          aplicadoPorTipo,
          aplicadoPorUsuarioId: aplicadoPorTipo === 'USUARIO' ? aplicadoPorUsuarioId : undefined,
          aplicadoPorVeterinarioId:
            aplicadoPorTipo === 'VETERINARIO' ? aplicadoPorVeterinarioId : undefined,
        });
        texto = `"${produto}" registrado em ${quantidade(resultado.aplicados)}.`;
      } else {
        const resultado = await moverPastoEmLote({ ...selecao, pastoDestinoId, data });
        const destino = pastos.find((pasto) => pasto.id === pastoDestinoId)?.nome ?? 'o pasto escolhido';
        texto = `${quantidade(resultado.movidos)} ${resultado.movidos === 1 ? 'movido' : 'movidos'} para ${destino}.`;
        if (resultado.jaEstavamNoDestino > 0) {
          texto +=
            resultado.jaEstavamNoDestino === 1
              ? ' 1 animal já estava lá.'
              : ` ${resultado.jaEstavamNoDestino} animais já estavam lá.`;
        }
      }
      if (selecao.excecoes.length === 1) {
        texto += ' 1 animal ficou de fora, com o motivo registrado.';
      } else if (selecao.excecoes.length > 1) {
        texto += ` ${selecao.excecoes.length} animais ficaram de fora, com os motivos registrados.`;
      }
      setAviso({ tipo: 'sucesso', texto });
      setAnimais(null);
      setExcecoes({});
      setProduto('');
      listarSessoes().then(setSessoes).catch(() => {});
    };

    setEnviando(true);
    try {
      if (acao === 'TRATAMENTO') await produtoLeite.enviar(executar, produto);
      else await executar();
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível aplicar o manejo.') });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <header>
        <h1>Manejo em lote</h1>
      </header>
      {produtoLeite.elementos}

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
          <select
            id="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Categoria | '')}
          >
            <option value="">Todas as categorias</option>
            {(Object.keys(ROTULOS_CATEGORIA) as Categoria[]).map((item) => (
              <option key={item} value={item}>
                {ROTULOS_CATEGORIA[item]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={!pastoId && !categoria}>
          Carregar animais
        </button>
      </form>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {animais && animais.length === 0 && (
        <Aviso tipo="atencao">Nenhum animal ativo nesse grupo.</Aviso>
      )}

      {animais && animais.length > 0 && (
        <form onSubmit={handleAplicar} className="form-lote">
          <p className="passo">
            2. Confira os animais ({marcados.length} de {animais.length} marcados)
          </p>
          <div className="acoes-marcacao">
            <button type="button" className="botao-link" onClick={() => marcarTodos(true)}>
              Marcar todos
            </button>
            <button type="button" className="botao-link" onClick={() => marcarTodos(false)}>
              Desmarcar todos
            </button>
          </div>
          <ul className="lista-lote">
            {animais.map((animal) => {
              const desmarcado = animal.id in excecoes;
              return (
                <li key={animal.id} className={desmarcado ? 'desmarcado' : undefined}>
                  <label>
                    <input type="checkbox" checked={!desmarcado} onChange={() => alternar(animal.id)} />
                    {rotuloBrinco(animal.brinco)} · {formatarCategoria(animal.categoria)}
                  </label>
                  {desmarcado && (
                    <input
                      aria-label={`Motivo para deixar o ${rotuloBrinco(animal.brinco)} de fora`}
                      placeholder="Motivo (ex.: prenhez avançada)"
                      maxLength={200}
                      value={excecoes[animal.id]}
                      onChange={(e) =>
                        setExcecoes((atuais) => ({ ...atuais, [animal.id]: e.target.value }))
                      }
                      required
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <p className="passo">3. O que aplicar</p>
          <fieldset>
            <legend className="sr-only">Ação</legend>
            <label>
              <input
                type="radio"
                name="acao"
                checked={acao === 'TRATAMENTO'}
                onChange={() => setAcao('TRATAMENTO')}
              />
              Tratamento
            </label>
            <label>
              <input type="radio" name="acao" checked={acao === 'PASTO'} onChange={() => setAcao('PASTO')} />
              Mudar de pasto
            </label>
          </fieldset>

          {acao === 'TRATAMENTO' ? (
            <>
              <div>
                <label htmlFor="produto">Produto</label>
                <input
                  id="produto"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  required
                  {...produtoLeite.atributosDoCampo}
                />
              </div>
              <div>
                <label htmlFor="data">Data</label>
                <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={temRecorrencia}
                  onChange={(e) => setTemRecorrencia(e.target.checked)}
                />
                Repetir a dose
              </label>
              {temRecorrencia && (
                <div>
                  <label htmlFor="recorrencia">A cada quantos dias</label>
                  <input
                    id="recorrencia"
                    type="number"
                    min={1}
                    value={recorrenciaDias}
                    onChange={(e) => setRecorrenciaDias(e.target.value)}
                    required
                  />
                </div>
              )}
              <div>
                <label htmlFor="tipo-aplicador">Aplicado por</label>
                <select
                  id="tipo-aplicador"
                  value={aplicadoPorTipo}
                  onChange={(e) => setAplicadoPorTipo(e.target.value as 'USUARIO' | 'VETERINARIO')}
                >
                  <option value="USUARIO">Funcionário / Dono</option>
                  <option value="VETERINARIO">Veterinário</option>
                </select>
              </div>
              {aplicadoPorTipo === 'USUARIO' ? (
                <div>
                  <label htmlFor="aplicador">Quem aplicou</label>
                  <select
                    id="aplicador"
                    value={aplicadoPorUsuarioId}
                    onChange={(e) => setAplicadoPorUsuarioId(e.target.value)}
                    required
                  >
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
                    value={aplicadoPorVeterinarioId}
                    onChange={(e) => setAplicadoPorVeterinarioId(e.target.value)}
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
            </>
          ) : (
            <>
              <div>
                <label htmlFor="destino">Para qual pasto</label>
                <select
                  id="destino"
                  value={pastoDestinoId}
                  onChange={(e) => setPastoDestinoId(e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {pastos
                    .filter((pasto) => pasto.id !== grupoCarregado?.pastoId)
                    .map((pasto) => (
                      <option key={pasto.id} value={pasto.id}>
                        {pasto.nome}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor="data-pasto">Data</label>
                <input
                  id="data-pasto"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" disabled={enviando || marcados.length === 0}>
            {enviando ? 'Aplicando...' : `Aplicar em ${quantidade(marcados.length)}`}
          </button>
        </form>
      )}

      <section>
        <h2>Últimas sessões</h2>
        {sessoes.length === 0 ? (
          <p>Nenhuma sessão de manejo em lote ainda.</p>
        ) : (
          <ul>
            {sessoes.map((sessao) => (
              <li key={sessao.id}>
                <strong>{formatarData(sessao.data)}</strong> —{' '}
                {sessao.tipo === 'TRATAMENTO'
                  ? `${sessao.produto} em ${quantidade(sessao.totalAnimais)}`
                  : `${quantidade(sessao.totalAnimais)} para ${sessao.pastoDestino}`}
                <br />
                <small>
                  Grupo: {[sessao.filtroPasto, sessao.filtroCategoria && formatarCategoria(sessao.filtroCategoria)]
                    .filter(Boolean)
                    .join(' · ')}
                  {sessao.criadoPor && <> · por {sessao.criadoPor}</>}
                </small>
                {sessao.excecoes.length > 0 && (
                  <details>
                    <summary>{sessao.excecoes.length} de fora</summary>
                    <ul>
                      {sessao.excecoes.map((excecao) => (
                        <li key={excecao.brinco}>
                          {rotuloBrinco(excecao.brinco)}: {excecao.motivo}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function quantidade(total: number) {
  return total === 1 ? '1 animal' : `${total} animais`;
}
