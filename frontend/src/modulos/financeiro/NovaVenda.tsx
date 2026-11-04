import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { listarPastos, type Pasto } from '../../api/pastos';
import { Aviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import {
  centavosDeTexto,
  formatarCategoria,
  formatarData,
  formatarReais,
  rotuloBrinco,
  ROTULOS_CATEGORIA,
  type Categoria,
} from '../../utils/formatadores';
import {
  listarAnimaisParaVenda,
  registrarVenda,
  simularVenda,
  type AnimalParaVenda,
  type DadosVenda,
  type FormaPreco,
  type SimulacaoVenda,
  type VendaDetalhe,
} from './api';
import { useFinanceiro } from './FinanceiroContext';

const LEMBRETE_BRINCO =
  'Retire o brinco só depois da venda confirmada, e só dos animais que subirem no caminhão.';

function formatarArrobas(arrobas: number | null) {
  return arrobas === null ? '—' : `${arrobas.toFixed(2).replace('.', ',')} @`;
}

// Venda de animais (spec 003, US2): escolher os animais, informar peso e preço,
// conferir a prévia e confirmar. A venda tira os animais do rebanho e lança a
// receita num passo só. O lembrete do brinco aparece antes e depois (FR-015a).
export function NovaVenda() {
  const { soConsulta } = useFinanceiro();
  const [busca] = useSearchParams();
  const animalInicial = busca.get('animal');

  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [pastoId, setPastoId] = useState('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [disponiveis, setDisponiveis] = useState<AnimalParaVenda[]>([]);
  // Animais escolhidos ficam guardados mesmo trocando o filtro
  const [escolhidos, setEscolhidos] = useState<Map<string, AnimalParaVenda>>(new Map());
  const [pesos, setPesos] = useState<Record<string, string>>({});

  const [data, setData] = useState(hojeLocal);
  const [comprador, setComprador] = useState('');
  const [forma, setForma] = useState<FormaPreco>('POR_ARROBA');
  const [preco, setPreco] = useState('');
  const [observacao, setObservacao] = useState('');

  const [previa, setPrevia] = useState<SimulacaoVenda | null>(null);
  const [vendida, setVendida] = useState<VendaDetalhe | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarPastos().then(setPastos).catch(() => {});
  }, []);

  useEffect(() => {
    listarAnimaisParaVenda({ pastoId: pastoId || undefined, categoria: categoria || undefined })
      .then((lista) => {
        setDisponiveis(lista);
        // Vindo da página do animal (?animal=), ele já entra escolhido
        if (animalInicial) {
          const animal = lista.find((a) => a.id === animalInicial);
          if (animal) {
            setEscolhidos((atual) => (atual.has(animal.id) ? atual : new Map(atual).set(animal.id, animal)));
            setPesos((atual) =>
              atual[animal.id] !== undefined || !animal.ultimaPesagem
                ? atual
                : { ...atual, [animal.id]: String(animal.ultimaPesagem.pesoKg).replace('.', ',') },
            );
          }
        }
      })
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [pastoId, categoria, animalInicial]);

  const listaEscolhidos = useMemo(
    () => [...escolhidos.values()].sort((a, b) => a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true })),
    [escolhidos],
  );

  if (soConsulta) return <Navigate to="/modulos/financeiro/vendas" replace />;

  function alternar(animal: AnimalParaVenda) {
    setPrevia(null);
    const novo = new Map(escolhidos);
    if (novo.has(animal.id)) {
      novo.delete(animal.id);
    } else {
      novo.set(animal.id, animal);
      // Sugere a última pesagem (FR-011)
      if (animal.ultimaPesagem && pesos[animal.id] === undefined) {
        setPesos((p) => ({ ...p, [animal.id]: String(animal.ultimaPesagem!.pesoKg).replace('.', ',') }));
      }
    }
    setEscolhidos(novo);
  }

  function montarDados(): DadosVenda | null {
    const precoCentavos = centavosDeTexto(preco);
    if (!precoCentavos || precoCentavos <= 0) {
      setErro(forma === 'POR_ARROBA' ? 'Informe o preço da arroba' : 'Informe o valor total da venda');
      return null;
    }
    return {
      data,
      comprador: comprador.trim(),
      forma,
      ...(forma === 'POR_ARROBA' ? { precoArrobaCentavos: precoCentavos } : { valorTotalCentavos: precoCentavos }),
      observacao: observacao.trim() || undefined,
      itens: listaEscolhidos.map((animal) => {
        const peso = Number((pesos[animal.id] ?? '').replace(',', '.'));
        return { animalId: animal.id, pesoKg: peso > 0 ? peso : undefined };
      }),
    };
  }

  async function handleCalcular(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    const dados = montarDados();
    if (!dados) return;
    try {
      setPrevia(await simularVenda(dados));
    } catch (e) {
      setPrevia(null);
      setErro(mensagemDeErro(e, 'Não foi possível calcular a venda.'));
    }
  }

  async function handleConfirmar() {
    setErro('');
    const dados = montarDados();
    if (!dados) return;
    setEnviando(true);
    try {
      setVendida(await registrarVenda(dados));
      window.scrollTo(0, 0);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível registrar a venda.'));
    } finally {
      setEnviando(false);
    }
  }

  if (vendida) {
    return (
      <div>
        <header>
          <h1>Venda registrada</h1>
        </header>
        <Aviso tipo="sucesso">
          Venda de {vendida.itens.length === 1 ? '1 animal' : `${vendida.itens.length} animais`} para {vendida.comprador}
          : {formatarReais(vendida.valorTotalCentavos)}. Os animais estão como vendidos e a receita foi lançada.
        </Aviso>
        <section className="lembrete-brinco">
          <h2>Na hora do embarque</h2>
          <p>{LEMBRETE_BRINCO}</p>
          <p>Brincos vendidos:</p>
          <ul className="brincos-embarque">
            {vendida.itens.map((item) => (
              <li key={item.animalId}>{rotuloBrinco(item.brinco)}</li>
            ))}
          </ul>
          <p className="dica">
            Se algum animal não embarcar, cancele esta venda e registre de novo só com os que subiram.
          </p>
        </section>
        <Link to={`/modulos/financeiro/vendas/${vendida.id}`}>Ver a venda</Link>
      </div>
    );
  }

  const precoCentavos = centavosDeTexto(preco);

  return (
    <div>
      <header>
        <h1>Vender animais</h1>
        <Link to="/modulos/financeiro/vendas">Vendas</Link>
      </header>

      <section>
        <p className="passo">1. Escolha os animais ({escolhidos.size})</p>
        <div className="filtro-linha">
          <label htmlFor="venda-pasto">Pasto</label>
          <select id="venda-pasto" value={pastoId} onChange={(e) => setPastoId(e.target.value)}>
            <option value="">Todos</option>
            {pastos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <label htmlFor="venda-categoria">Categoria</label>
          <select
            id="venda-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as Categoria | '')}
          >
            <option value="">Todas</option>
            {(Object.keys(ROTULOS_CATEGORIA) as Categoria[]).map((c) => (
              <option key={c} value={c}>
                {ROTULOS_CATEGORIA[c]}
              </option>
            ))}
          </select>
        </div>
        {disponiveis.length === 0 ? (
          <p>Nenhum animal ativo com esse filtro.</p>
        ) : (
          <ul className="lista-escolha">
            {disponiveis.map((animal) => (
              <li key={animal.id}>
                <label>
                  <input type="checkbox" checked={escolhidos.has(animal.id)} onChange={() => alternar(animal)} />
                  <strong>{rotuloBrinco(animal.brinco)}</strong> · {formatarCategoria(animal.categoria)}
                  {animal.pasto && ` · ${animal.pasto.nome}`}
                  {animal.ultimaPesagem && (
                    <small>
                      {' '}
                      · {String(animal.ultimaPesagem.pesoKg).replace('.', ',')} kg em{' '}
                      {formatarData(animal.ultimaPesagem.data)}
                    </small>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      {escolhidos.size > 0 && (
        <form onSubmit={handleCalcular}>
          <p className="passo">2. Peso, preço e comprador</p>
          <div>
            <label htmlFor="venda-forma">Preço</label>
            <select
              id="venda-forma"
              value={forma}
              onChange={(e) => {
                setForma(e.target.value as FormaPreco);
                setPrevia(null);
              }}
            >
              <option value="POR_ARROBA">Por arroba</option>
              <option value="VALOR_TOTAL">Valor total da venda</option>
            </select>
          </div>
          <div>
            <label htmlFor="venda-preco">
              {forma === 'POR_ARROBA' ? 'Preço da arroba (R$)' : 'Valor total (R$)'}
            </label>
            <input
              id="venda-preco"
              inputMode="decimal"
              placeholder="0,00"
              value={preco}
              onChange={(e) => {
                setPreco(e.target.value);
                setPrevia(null);
              }}
              required
            />
            {precoCentavos !== null && precoCentavos > 0 && <small>{formatarReais(precoCentavos)}</small>}
          </div>
          <div>
            <span className="rotulo-campo">
              Peso de cada animal (kg){forma === 'POR_ARROBA' ? '' : ', opcional'}
            </span>
            <ul className="lista-pesos">
              {listaEscolhidos.map((animal) => (
                <li key={animal.id}>
                  <label htmlFor={`peso-${animal.id}`}>
                    {rotuloBrinco(animal.brinco)} · {formatarCategoria(animal.categoria)}
                  </label>
                  <input
                    id={`peso-${animal.id}`}
                    inputMode="decimal"
                    placeholder="kg"
                    value={pesos[animal.id] ?? ''}
                    onChange={(e) => {
                      setPesos((p) => ({ ...p, [animal.id]: e.target.value }));
                      setPrevia(null);
                    }}
                    required={forma === 'POR_ARROBA'}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <label htmlFor="venda-comprador">Comprador</label>
            <input
              id="venda-comprador"
              maxLength={120}
              value={comprador}
              onChange={(e) => setComprador(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="venda-data">Data da venda</label>
            <input id="venda-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="venda-obs">Observação (opcional)</label>
            <input id="venda-obs" maxLength={200} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          {erro && !previa && <Aviso tipo="erro">{erro}</Aviso>}
          <button type="submit">Calcular a venda</button>
        </form>
      )}

      {previa && (
        <section className="previa-venda">
          <p className="passo">3. Confira e confirme</p>
          <ul className="lista-lancamentos">
            {previa.itens.map((item) => {
              const animal = escolhidos.get(item.animalId);
              return (
                <li key={item.animalId}>
                  <div className="indicador-cabecalho">
                    <span>
                      {animal ? rotuloBrinco(animal.brinco) : ''} · {formatarArrobas(item.arrobas)}
                    </span>
                    <strong>{formatarReais(item.valorCentavos)}</strong>
                  </div>
                </li>
              );
            })}
          </ul>
          <p>
            Total: <strong>{formatarArrobas(previa.arrobasTotal)}</strong> ·{' '}
            <strong className="valor-receita">{formatarReais(previa.valorTotalCentavos)}</strong>
          </p>
          <Aviso tipo="atencao">{LEMBRETE_BRINCO}</Aviso>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <button type="button" className="botao-confirmar" disabled={enviando} onClick={handleConfirmar}>
            {enviando
              ? 'Registrando...'
              : `Confirmar venda de ${previa.itens.length === 1 ? '1 animal' : `${previa.itens.length} animais`}`}
          </button>
        </section>
      )}
    </div>
  );
}
