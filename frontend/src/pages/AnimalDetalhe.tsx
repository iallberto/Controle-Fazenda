import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { buscarAnimal, type Animal } from '../api/animais';
import { listarTratamentosPorAnimal, type Tratamento } from '../api/tratamentos';
import { definirPaiDoParto, listarPartosPorMae, type Parto } from '../api/partos';
import { useAuth } from '../contexts/useAuth';
import { listarPesagensPorAnimal, type Pesagem } from '../api/pesagens';
import {
  reemitirCodigo,
  listarHistoricoNumero,
  type HistoricoNumero,
} from '../api/codigos';
import {
  converterEmArrobas,
  formatarArrobas,
  formatarBrinco,
  formatarCategoria,
  rotuloBrinco,
  formatarData,
  formatarMomento,
  formatarOrigem,
  formatarPeso,
  formatarResultadoParto,
  formatarSexo,
  formatarStatusAnimal,
  formatarTipoParto,
} from '../utils/formatadores';
import { obterConfiguracao, type ValorArroba } from '../api/configuracao';
import { Aviso, type EstadoAviso } from '../components/Aviso';

interface PartoComIntervalo extends Parto {
  diasDesdeUltimoParto: number | null;
}

function calcularIntervalos(partos: Parto[]): PartoComIntervalo[] {
  const ordenados = [...partos].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  );

  return ordenados.map((parto, indice) => {
    if (indice === 0) {
      return { ...parto, diasDesdeUltimoParto: null };
    }
    const dataAtual = new Date(parto.data).getTime();
    const dataAnterior = new Date(ordenados[indice - 1].data).getTime();
    const dias = Math.round((dataAtual - dataAnterior) / (1000 * 60 * 60 * 24));
    return { ...parto, diasDesdeUltimoParto: dias };
  });
}

export function AnimalDetalhe() {
  const { usuario } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [partos, setPartos] = useState<PartoComIntervalo[]>([]);
  const [pesagens, setPesagens] = useState<Pesagem[]>([]);
  const [historicoNumeros, setHistoricoNumeros] = useState<HistoricoNumero[]>([]);
  const [valoresArroba, setValoresArroba] = useState<ValorArroba[]>([]);

  const [mostrarReemissao, setMostrarReemissao] = useState(false);
  const [motivoReemissao, setMotivoReemissao] = useState('');
  const [reemitindo, setReemitindo] = useState(false);
  const [avisoReemissao, setAvisoReemissao] = useState<EstadoAviso>(null);

  useEffect(() => {
    if (!id) return;

    buscarAnimal(id).then((dadosAnimal) => {
      setAnimal(dadosAnimal);
      if (dadosAnimal.categoria === 'MATRIZ') {
        listarPartosPorMae(id).then((dadosPartos) => {
          setPartos(calcularIntervalos(dadosPartos));
        });
      }
    });
    listarPesagensPorAnimal(id).then(setPesagens);
    listarTratamentosPorAnimal(id).then(setTratamentos);
    listarHistoricoNumero(id).then(setHistoricoNumeros);
    obterConfiguracao().then((config) => setValoresArroba(config.valoresArroba));
  }, [id]);

  async function handleReemitir(evento: FormEvent) {
    evento.preventDefault();
    if (!id) return;
    setAvisoReemissao(null);
    setReemitindo(true);
    try {
      const novoCodigo = await reemitirCodigo(id, motivoReemissao);
      const [animalAtualizado, historico] = await Promise.all([
        buscarAnimal(id),
        listarHistoricoNumero(id),
      ]);
      setAnimal(animalAtualizado);
      setHistoricoNumeros(historico);
      setAvisoReemissao({ tipo: 'sucesso', texto: `Novo brinco gerado: ${formatarBrinco(novoCodigo.numero)}.` });
      setMostrarReemissao(false);
      setMotivoReemissao('');
    } catch {
      setAvisoReemissao({ tipo: 'erro', texto: 'Não foi possível reemitir o código.' });
    } finally {
      setReemitindo(false);
    }
  }

  if (!animal) {
    return <p>Carregando...</p>;
  }

  const kgPorArroba = valoresArroba.find((v) => v.categoria === animal.categoria)?.pesoReferenciaKg;

  return (
    <div>
      <header>
        <h1>Brinco {formatarBrinco(animal.brinco)}</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <section>
        <h2>Dados gerais</h2>
        <p>Sexo: {formatarSexo(animal.sexo)}</p>
        <p>Categoria: {formatarCategoria(animal.categoria)}</p>
        <p>Status: {formatarStatusAnimal(animal.status)}</p>
        <p>Nascimento: {formatarData(animal.dataNascimento)}</p>
        <p>Origem: {formatarOrigem(animal.origem)}</p>
        {animal.mae && (
          <p>
            Mãe:{' '}
            <Link to={`/animais/${animal.mae.id}`}>
              Brinco {formatarBrinco(animal.mae.brinco)}
            </Link>
          </p>
        )}
        {animal.pai && (
          <p>
            Pai: <Link to={`/animais/${animal.pai.id}`}>{rotuloBrinco(animal.pai.brinco)}</Link>
          </p>
        )}
        {animal.paiSemen && <p>Pai: sêmen {animal.paiSemen.nomeTouro}</p>}
        <p>Pasto: {animal.pastoAtual?.nome ?? 'Não informado'}</p>
      </section>

      <section>
        <h2>Identificação</h2>
        {historicoNumeros.length > 0 && (
          <ul>
            {historicoNumeros.map((item) => (
              <li key={item.id}>
                Antes era {formatarBrinco(item.numeroAnterior)} (agora{' '}
                {formatarBrinco(item.numeroNovo)}) —{' '}
                {formatarMomento(item.reemitidoEm)}
                {item.motivo && <> — {item.motivo}</>}
              </li>
            ))}
          </ul>
        )}

        {!mostrarReemissao && (
          <button type="button" onClick={() => setMostrarReemissao(true)}>
            Reemitir código (brinco perdido)
          </button>
        )}
        {mostrarReemissao && (
          <form onSubmit={handleReemitir}>
            <p>
              Use só quando o brinco deste animal foi <strong>perdido, quebrou ou ficou
              ilegível</strong>. Para identificar um animal novo, use "Cadastrar animal" e
              escolha um código disponível.
            </p>
            <p>
              O animal receberá um novo número e o atual será desativado. A busca pelo número
              antigo continua levando a este animal. Essa ação não pode ser desfeita.
            </p>
            <input
              placeholder="Motivo (opcional)"
              maxLength={200}
              value={motivoReemissao}
              onChange={(e) => setMotivoReemissao(e.target.value)}
            />
            <button type="submit" disabled={reemitindo}>
              {reemitindo ? 'Reemitindo...' : 'Confirmar reemissão'}
            </button>
            <button type="button" onClick={() => setMostrarReemissao(false)}>
              Cancelar
            </button>
          </form>
        )}
        {avisoReemissao && <Aviso tipo={avisoReemissao.tipo}>{avisoReemissao.texto}</Aviso>}
      </section>

      {animal.categoria === 'MATRIZ' && (
        <section>
          <h2>Histórico de partos ({partos.length})</h2>
          {partos.length === 0 && <p>Nenhum parto registrado ainda.</p>}
          <ul>
            {partos.map((parto) => (
              <li key={parto.id}>
                {formatarData(parto.data)} — {formatarResultadoParto(parto.resultado)} ({formatarTipoParto(parto.tipo)})
                {parto.diasDesdeUltimoParto !== null && (
                  <> — {parto.diasDesdeUltimoParto} dias desde o parto anterior</>
                )}
                {parto.crias.length > 0 && (
                  <> — crias: {parto.crias.map((c) => formatarBrinco(c.brinco)).join(', ')}</>
                )}
                <PaiDoParto
                  parto={parto}
                  ehDono={usuario?.papel === 'DONO'}
                  aoDefinir={async (pai) => {
                    await definirPaiDoParto(parto.id, pai);
                    const dadosPartos = await listarPartosPorMae(animal.id);
                    setPartos(calcularIntervalos(dadosPartos));
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Pesagens ({pesagens.length})</h2>
        {pesagens.length === 0 && <p>Nenhuma pesagem registrada ainda.</p>}
        <ul>
          {pesagens.map((pesagem) => (
            <li key={pesagem.id}>
              {formatarData(pesagem.data)} — {formatarPeso(pesagem.pesoKg)} (
              {formatarArrobas(converterEmArrobas(pesagem.pesoKg, kgPorArroba))})
              {pesagem.gmdDesdeAnterior !== null && (
                <> — GMD: {pesagem.gmdDesdeAnterior.toLocaleString('pt-BR')} kg/dia</>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Tratamentos ({tratamentos.length})</h2>
        {tratamentos.length === 0 && <p>Nenhum tratamento registrado ainda.</p>}
        <ul>
          {tratamentos.map((tratamento) => (
            <li key={tratamento.id}>
              {formatarData(tratamento.data)} — {tratamento.produto}
              {tratamento.responsavel && <> · aplicado por {tratamento.responsavel}</>}
              {tratamento.proximaDataPrevista && (
                  <> — próxima aplicação prevista: {formatarData(tratamento.proximaDataPrevista)}</>
            )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// Pai das crias de um parto (US4): definido, ou candidatos para o dono escolher (FR-021)
function PaiDoParto({
  parto,
  ehDono,
  aoDefinir,
}: {
  parto: Parto;
  ehDono: boolean;
  aoDefinir: (pai: { touroId?: string; semenId?: string }) => Promise<void>;
}) {
  const [escolha, setEscolha] = useState('');
  const [erro, setErro] = useState('');
  const candidatos = parto.candidatos ?? [];
  const cria = parto.crias[0];
  if (!cria || candidatos.length === 0) return null;

  const nome = (candidato: (typeof candidatos)[number]) =>
    candidato.touroId
      ? `touro ${candidato.touro ? formatarBrinco(candidato.touro.brinco) : ''}`
      : `sêmen ${candidato.semen?.nomeTouro ?? ''}`;
  const definido = candidatos.find(
    (candidato) =>
      (candidato.touroId && candidato.touroId === cria.paiId) ||
      (candidato.semenId && candidato.semenId === cria.paiSemenId),
  );

  if (definido) return <> — pai: {nome(definido)}</>;

  return (
    <>
      {' '}— pai: um destes ({candidatos.map(nome).join(', ')})
      {ehDono && (
        <span className="cancelar-inline">
          <select aria-label="Definir o pai" value={escolha} onChange={(e) => setEscolha(e.target.value)}>
            <option value="">Definir pai</option>
            {candidatos.map((candidato) => (
              <option key={candidato.touroId ?? candidato.semenId} value={candidato.touroId ? `t:${candidato.touroId}` : `s:${candidato.semenId}`}>
                {nome(candidato)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!escolha}
            onClick={async () => {
              setErro('');
              const [tipo, id] = escolha.split(':');
              try {
                await aoDefinir(tipo === 't' ? { touroId: id } : { semenId: id });
              } catch {
                setErro('Não foi possível definir o pai.');
              }
            }}
          >
            Salvar
          </button>
        </span>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </>
  );
}
