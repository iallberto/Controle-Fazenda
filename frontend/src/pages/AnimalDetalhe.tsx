import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { buscarAnimal, type Animal } from '../api/animais';
import { listarTratamentosPorAnimal, type Tratamento } from '../api/tratamentos';
import { listarPartosPorMae, type Parto } from '../api/partos';
import { listarPesagensPorAnimal, type Pesagem } from '../api/pesagens';
import {
  reemitirCodigo,
  listarHistoricoNumero,
  type HistoricoNumero,
} from '../api/codigos';
import { formatarBrinco } from '../utils/formatarBrinco';
import { formatarData, formatarSexo } from '../utils/formatadores';

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
  const { id } = useParams<{ id: string }>();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [partos, setPartos] = useState<PartoComIntervalo[]>([]);
  const [pesagens, setPesagens] = useState<Pesagem[]>([]);
  const [historicoNumeros, setHistoricoNumeros] = useState<HistoricoNumero[]>([]);

  const [mostrarReemissao, setMostrarReemissao] = useState(false);
  const [motivoReemissao, setMotivoReemissao] = useState('');
  const [reemitindo, setReemitindo] = useState(false);
  const [mensagemReemissao, setMensagemReemissao] = useState('');

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
  }, [id]);

  async function handleReemitir(evento: FormEvent) {
    evento.preventDefault();
    if (!id) return;
    setMensagemReemissao('');
    setReemitindo(true);
    try {
      const novoCodigo = await reemitirCodigo(id, motivoReemissao);
      const [animalAtualizado, historico] = await Promise.all([
        buscarAnimal(id),
        listarHistoricoNumero(id),
      ]);
      setAnimal(animalAtualizado);
      setHistoricoNumeros(historico);
      setMensagemReemissao(`Novo brinco gerado: ${formatarBrinco(novoCodigo.numero)}`);
      setMostrarReemissao(false);
      setMotivoReemissao('');
    } catch {
      setMensagemReemissao('Não foi possível reemitir o código.');
    } finally {
      setReemitindo(false);
    }
  }

  if (!animal) {
    return <p>Carregando...</p>;
  }

  return (
    <div>
      <header>
        <h1>Brinco {formatarBrinco(animal.brinco)}</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <section>
        <h2>Dados gerais</h2>
        <p>Sexo: {formatarSexo(animal.sexo)}</p>
        <p>Categoria: {animal.categoria}</p>
        <p>Status: {animal.status}</p>
        <p>Nascimento: {formatarData(animal.dataNascimento)}</p>
        <p>Origem: {animal.origem === 'COMPRADO' ? 'Comprado' : 'Nascido na fazenda'}</p>
        {animal.mae && (
          <p>
            Mãe:{' '}
            <Link to={`/animais/${animal.mae.id}`}>
              Brinco {formatarBrinco(animal.mae.brinco)}
            </Link>
          </p>
        )}
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
                {new Date(item.reemitidoEm).toLocaleDateString('pt-BR')}
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
              O animal receberá um novo número e o atual será desativado. Essa ação não
              pode ser desfeita.
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
        {mensagemReemissao && <p>{mensagemReemissao}</p>}
      </section>

      {animal.categoria === 'MATRIZ' && (
        <section>
          <h2>Histórico de partos ({partos.length})</h2>
          {partos.length === 0 && <p>Nenhum parto registrado ainda.</p>}
          <ul>
            {partos.map((parto) => (
              <li key={parto.id}>
                {formatarData(parto.data)} — {parto.resultado} ({parto.tipo})
                {parto.diasDesdeUltimoParto !== null && (
                  <> — {parto.diasDesdeUltimoParto} dias desde o parto anterior</>
                )}
                {parto.crias.length > 0 && (
                  <> — crias: {parto.crias.map((c) => formatarBrinco(c.brinco)).join(', ')}</>
                )}
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
              {formatarData(pesagem.data)} — {pesagem.pesoKg} kg
              {pesagem.gmdDesdeAnterior !== null && (
                <> — GMD: {pesagem.gmdDesdeAnterior} kg/dia</>
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
              {formatarData(tratamento.data)} — {tratamento.produto} ({tratamento.responsavel})
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