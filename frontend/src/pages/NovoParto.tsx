import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { criarParto, type Cria } from '../api/partos';
import { listarAnimais, type Animal } from '../api/animais';
import { buscarCandidatosPai } from '../api/reproducao';
import { listarDisponiveis, type Codigo } from '../api/codigos';
import { listarPastos, type Pasto } from '../api/pastos';
import { formatarBrinco, formatarCategoria, rotuloBrinco } from '../utils/formatadores';
import { Aviso } from '../components/Aviso';

export function NovoParto() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');

  const [maeId, setMaeId] = useState('');
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState<'NORMAL' | 'ASSISTIDO'>('NORMAL');
  const [resultado, setResultado] = useState<'VIVO' | 'NATIMORTO'>('VIVO');
  const [observacoes, setObservacoes] = useState('');
  const [crias, setCrias] = useState<Cria[]>([{ codigoId: '', sexo: 'F' }]);

  const [matrizes, setMatrizes] = useState<Animal[]>([]);
  const [paiPrevisto, setPaiPrevisto] = useState('');
  const [codigosDisponiveis, setCodigosDisponiveis] = useState<Codigo[]>([]);
  const [pastoAtualId, setPastoAtualId] = useState('');
  const [pastos, setPastos] = useState<Pasto[]>([]);

  useEffect(() => {
    // Matrizes e novilhas ativas; novilha que pare vira matriz (FR-031). Prenhes primeiro.
    listarAnimais().then((lista) =>
      setMatrizes(
        lista
          .filter(
            (animal) =>
              animal.status === 'ATIVO' && (animal.categoria === 'MATRIZ' || animal.categoria === 'NOVILHA'),
          )
          .sort((a, b) => Number(b.statusReprodutivo === 'PRENHA') - Number(a.statusReprodutivo === 'PRENHA')),
      ),
    );
    listarDisponiveis().then(setCodigosDisponiveis);
    listarPastos().then(setPastos);
  }, []);

  const maeSelecionada = matrizes.find((matriz) => matriz.id === maeId);

  // Prévia do pai pela cobertura registrada, na data do parto (US4)
  useEffect(() => {
    if (!maeId || !data) return;
    let ativo = true;
    buscarCandidatosPai(maeId, data)
      .then(({ touros, semens }) => {
        if (!ativo) return;
        const nomes = [
          ...touros.map((touro) => (touro.brinco ? `touro ${formatarBrinco(touro.brinco)}` : 'touro')),
          ...semens.map((semen) => `sêmen ${semen.nomeTouro ?? ''}`.trim()),
        ];
        setPaiPrevisto(
          nomes.length === 0
            ? ''
            : nomes.length === 1
              ? `Pai previsto pela cobertura: ${nomes[0]}.`
              : `Pai: um destes (${nomes.join(', ')}). O dono define depois, na página da mãe.`,
        );
      })
      .catch(() => ativo && setPaiPrevisto(''));
    return () => {
      ativo = false;
    };
  }, [maeId, data]);

  function adicionarCria() {
    setCrias([...crias, { codigoId: '', sexo: 'F' }]);
  }

  function removerCria(indice: number) {
    setCrias(crias.filter((_, i) => i !== indice));
  }

  function atualizarCria(indice: number, campo: keyof Cria, valor: string) {
    setCrias(crias.map((cria, i) => (i === indice ? { ...cria, [campo]: valor } : cria)));
  }

  function opcoesParaLinha(indiceAtual: number) {
    const idsUsadosEmOutrasLinhas = crias
      .filter((_, i) => i !== indiceAtual)
      .map((c) => c.codigoId);
    return codigosDisponiveis.filter((c) => !idsUsadosEmOutrasLinhas.includes(c.id));
  }

 async function handleSubmit(evento: FormEvent) {
  evento.preventDefault();
  setErro('');

    try {
      const parto = await criarParto({
        maeId,
        data,
        tipo,
        resultado,
        observacoes: observacoes || undefined,
        crias: resultado === 'VIVO' ? crias : undefined,
        pastoId: pastoAtualId || undefined, 
      });
      const quantidadeCrias = parto?.crias?.length ?? 0;
      const aviso =
        quantidadeCrias > 0
          ? `Parto registrado. ${quantidadeCrias === 1 ? '1 cria cadastrada' : `${quantidadeCrias} crias cadastradas`}.`
          : 'Parto registrado.';
      navigate('/animais', { state: { aviso } });
    } catch (erroRequisicao) {
      const mensagem =
        axios.isAxiosError(erroRequisicao) && erroRequisicao.response?.data?.message
          ? erroRequisicao.response.data.message
          : 'Não foi possível registrar o parto. Confira os dados.';
      setErro(Array.isArray(mensagem) ? mensagem.join(', ') : mensagem);
    }
  }

  return (
    <div>
      <header>
        <h1>Registrar parto</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      {resultado === 'VIVO' && codigosDisponiveis.length === 0 && (
        <p>
          Nenhum código disponível. <Link to="/qrcodes">Gere um lote de códigos</Link> antes de
          registrar um parto com crias vivas.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="mae">Mãe</label>
          <select id="mae" value={maeId} onChange={(e) => setMaeId(e.target.value)} required>
            <option value="">Selecione a mãe</option>
            {matrizes.map((matriz) => (
              <option key={matriz.id} value={matriz.id}>
                {rotuloBrinco(matriz.brinco)} · {formatarCategoria(matriz.categoria)}
                {matriz.statusReprodutivo === 'PRENHA' ? ' · prenha' : ''}
              </option>
            ))}
          </select>
          {maeSelecionada?.categoria === 'NOVILHA' && (
            <p className="dica">Ao registrar o parto, a novilha passa a ser matriz.</p>
          )}
          {paiPrevisto && <p className="dica">{paiPrevisto}</p>}
        </div>

        <div>
          <label htmlFor="data">Data do parto</label>
          <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="NORMAL">Normal</option>
            <option value="ASSISTIDO">Assistido</option>
          </select>
        </div>

        <div>
          <label htmlFor="resultado">Resultado</label>
          <select
            id="resultado"
            value={resultado}
            onChange={(e) => setResultado(e.target.value as typeof resultado)}
          >
            <option value="VIVO">Vivo</option>
            <option value="NATIMORTO">Natimorto</option>
          </select>
        </div>
        <div>
          <label htmlFor="pasto">Pasto</label>
           <select id="pasto" value={pastoAtualId} onChange={(e) => setPastoAtualId(e.target.value)}>
            <option value="">Não definido</option>
              {pastos.map((pasto) => (
            <option key={pasto.id} value={pasto.id}>
               {pasto.nome}
           </option>
            ))}
           </select>
        </div>

        <div>
          <label htmlFor="observacoes">Observações</label>
          <textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {resultado === 'VIVO' && (
          <fieldset>
            <legend>Crias</legend>
            {crias.map((cria, indice) => (
              <div key={indice}>
                <select
                  value={cria.codigoId}
                  onChange={(e) => atualizarCria(indice, 'codigoId', e.target.value)}
                  required
                >
                  <option value="">Selecione o código</option>
                  {opcoesParaLinha(indice).map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatarBrinco(c.numero)}
                    </option>
                  ))}
                </select>
                <select
                  value={cria.sexo}
                  onChange={(e) => atualizarCria(indice, 'sexo', e.target.value)}
                >
                  <option value="F">Fêmea</option>
                  <option value="M">Macho</option>
                </select>
                {crias.length > 1 && (
                  <button type="button" onClick={() => removerCria(indice)}>
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={adicionarCria}>
              Adicionar outra cria
            </button>
          </fieldset>
        )}

        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit">Registrar parto</button>
      </form>
    </div>
  );
}