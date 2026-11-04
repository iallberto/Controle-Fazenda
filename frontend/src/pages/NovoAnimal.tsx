import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { criarAnimal, listarAnimais, type Animal } from '../api/animais';
import { listarRacas, type Raca } from '../api/racas';
import { listarPastos, type Pasto } from '../api/pastos';
import { listarDisponiveis, type Codigo } from '../api/codigos';
import {
  CATEGORIAS_POR_SEXO,
  ROTULOS_CATEGORIA,
  formatarBrinco,
  rotuloBrinco,
} from '../utils/formatadores';
import { Aviso } from '../components/Aviso';
import { useAuth } from '../contexts/useAuth';
import { useModulos } from '../contexts/useModulos';
import { cadastrarAnimalComprado } from '../modulos/financeiro/api';
import { centavosDeTexto, formatarReais } from '../utils/formatadores';

export function NovoAnimal() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');

  const [codigoId, setCodigoId] = useState('');
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F'>('F');
  const [categoria, setCategoria] = useState<
    'BEZERRO' | 'NOVILHA' | 'MATRIZ' | 'GARROTE' | 'BOI' | 'TOURO'
  >('NOVILHA');
  const [origem, setOrigem] = useState<'NASCIDO_FAZENDA' | 'COMPRADO'>('NASCIDO_FAZENDA');
  const [dataNascimento, setDataNascimento] = useState('');
  const [racaId, setRacaId] = useState('');
  const [maeId, setMaeId] = useState('');
  const [dataCompra, setDataCompra] = useState('');
  const [procedencia, setProcedencia] = useState('');
  // Financeiro ativo + dono: a compra já sai com o valor (spec 003, FR-016b)
  const { usuario } = useAuth();
  const { situacaoDe } = useModulos();
  const comFinanceiro = usuario?.papel === 'DONO' && situacaoDe('FINANCEIRO')?.situacao === 'ATIVO';
  const [valorCompra, setValorCompra] = useState('');

  const [codigosDisponiveis, setCodigosDisponiveis] = useState<Codigo[]>([]);
  const [matrizes, setMatrizes] = useState<Animal[]>([]);
  const [racas, setRacas] = useState<Raca[]>([]);
  const [pastoAtualId, setPastoAtualId] = useState('');
  const [pastos, setPastos] = useState<Pasto[]>([]);

  useEffect(() => {
    listarAnimais('MATRIZ').then(setMatrizes);
    listarRacas().then(setRacas);
    carregarCodigos();
    listarPastos().then(setPastos);
  }, []);

  // Os brincos costumam ser aplicados em ordem: já deixa o menor código disponível
  // escolhido. A lista vem do backend em ordem crescente de número.
  function carregarCodigos() {
    listarDisponiveis().then((lista) => {
      setCodigosDisponiveis(lista);
      setCodigoId(lista[0]?.id ?? '');
    });
  }

  // "0187" e "187" encontram o mesmo código
  const termoCodigo = filtroCodigo.trim().replace(/^0+(?=\d)/, '');
  const codigosFiltrados = termoCodigo
    ? codigosDisponiveis.filter((c) => String(c.numero).includes(termoCodigo))
    : codigosDisponiveis;

  function handleFiltroCodigo(valor: string) {
    setFiltroCodigo(valor);
    const termo = valor.trim().replace(/^0+(?=\d)/, '');
    const primeiro = codigosDisponiveis.find((c) => !termo || String(c.numero).includes(termo));
    setCodigoId(primeiro?.id ?? '');
  }

  // A categoria padrão acompanha o sexo escolhido
  function handleSexoChange(novoSexo: 'M' | 'F') {
    setSexo(novoSexo);
    setCategoria(novoSexo === 'F' ? 'NOVILHA' : 'BEZERRO');
  }

  const opcoesCategoria = CATEGORIAS_POR_SEXO[sexo].map((valor) => ({
    valor,
    rotulo: ROTULOS_CATEGORIA[valor],
  }));

async function handleSubmit(evento: FormEvent) {
  evento.preventDefault();
  setErro('');

    const centavosCompra = centavosDeTexto(valorCompra);
    const lancarCompra = origem === 'COMPRADO' && comFinanceiro;
    if (lancarCompra && centavosCompra === null) {
      setErro('Informe o valor pago (0,00 se não quiser lançar)');
      return;
    }

    try {
      const dadosAnimal = {
        codigoId,
        sexo,
        categoria,
        origem,
        dataNascimento,
        racaId: racaId || undefined,
        maeId: origem === 'NASCIDO_FAZENDA' ? maeId : undefined,
        dataCompra: origem === 'COMPRADO' ? dataCompra : undefined,
        procedencia: origem === 'COMPRADO' ? procedencia || undefined : undefined,
        pastoAtualId: pastoAtualId || undefined,
      } as const;
      const novo = lancarCompra
        ? await cadastrarAnimalComprado(dadosAnimal, centavosCompra!, procedencia || undefined)
        : await criarAnimal(dadosAnimal);
      const compra =
        lancarCompra && centavosCompra! > 0 ? ` Compra de ${formatarReais(centavosCompra!)} lançada no Financeiro.` : '';
      navigate('/animais', { state: { aviso: `${rotuloBrinco(novo.brinco)} cadastrado.${compra}` } });
    } catch (erroRequisicao) {
      // 409: outra pessoa usou este código enquanto a tela estava aberta
      if (axios.isAxiosError(erroRequisicao) && erroRequisicao.response?.status === 409) {
        carregarCodigos();
      }
      const mensagem =
        axios.isAxiosError(erroRequisicao) && erroRequisicao.response?.data?.message
          ? erroRequisicao.response.data.message
          : 'Não foi possível cadastrar o animal. Confira os dados.';
      setErro(Array.isArray(mensagem) ? mensagem.join(', ') : mensagem);
    }
  }

  return (
    <div>
      <header>
        <h1>Novo animal</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      {codigosDisponiveis.length === 0 && (
        <p>
          Nenhum código disponível. <Link to="/qrcodes">Gere um lote de códigos</Link> antes de
          cadastrar.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="filtro-codigo">Buscar código pelo número</label>
          <input
            id="filtro-codigo"
            inputMode="numeric"
            placeholder="Ex.: 187"
            value={filtroCodigo}
            onChange={(e) => handleFiltroCodigo(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="codigo">Código (brinco)</label>
          <select
            id="codigo"
            value={codigoId}
            onChange={(e) => setCodigoId(e.target.value)}
            required
          >
            <option value="">
              {codigosFiltrados.length === 0 && filtroCodigo
                ? 'Nenhum código disponível com esse número'
                : 'Selecione o código'}
            </option>
            {codigosFiltrados.map((c) => (
              <option key={c.id} value={c.id}>
                {formatarBrinco(c.numero)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sexo">Sexo</label>
          <select id="sexo" value={sexo} onChange={(e) => handleSexoChange(e.target.value as 'M' | 'F')}>
            <option value="F">Fêmea</option>
            <option value="M">Macho</option>
          </select>
        </div>

        <div>
          <label htmlFor="categoria">Categoria</label>
          <select
            id="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as typeof categoria)}
          >
            {opcoesCategoria.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="origem">Origem</label>
          <select
            id="origem"
            value={origem}
            onChange={(e) => setOrigem(e.target.value as typeof origem)}
          >
            <option value="NASCIDO_FAZENDA">Nascido na fazenda</option>
            <option value="COMPRADO">Comprado</option>
          </select>
        </div>

        <div>
          <label htmlFor="dataNascimento">Data de nascimento</label>
          <input
            id="dataNascimento"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="raca">Raça</label>
          <select id="raca" value={racaId} onChange={(e) => setRacaId(e.target.value)}>
            <option value="">Não definida</option>
            {racas.map((raca) => (
              <option key={raca.id} value={raca.id}>
                {raca.nome}
              </option>
            ))}
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

        {origem === 'NASCIDO_FAZENDA' && (
          <div>
            <label htmlFor="mae">Mãe</label>
            <select id="mae" value={maeId} onChange={(e) => setMaeId(e.target.value)} required>
              <option value="">Selecione a matriz</option>
              {matrizes.map((matriz) => (
                <option key={matriz.id} value={matriz.id}>
                  {rotuloBrinco(matriz.brinco)}
                </option>
              ))}
            </select>
          </div>
        )}

        {origem === 'COMPRADO' && (
          <>
            <div>
              <label htmlFor="dataCompra">Data da compra</label>
              <input
                id="dataCompra"
                type="date"
                value={dataCompra}
                onChange={(e) => setDataCompra(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="procedencia">Procedência</label>
              <input
                id="procedencia"
                value={procedencia}
                onChange={(e) => setProcedencia(e.target.value)}
              />
            </div>
            {comFinanceiro && (
              <div>
                <label htmlFor="valorCompra">Valor pago (R$)</label>
                <input
                  id="valorCompra"
                  inputMode="decimal"
                  placeholder="0,00 para não lançar"
                  value={valorCompra}
                  onChange={(e) => setValorCompra(e.target.value)}
                  required
                />
                <small>
                  {centavosDeTexto(valorCompra)
                    ? `Lança uma despesa de ${formatarReais(centavosDeTexto(valorCompra))} em Compra de animais`
                    : 'Com 0,00 o animal é cadastrado sem lançar a compra'}
                </small>
              </div>
            )}
          </>
        )}

        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
}