import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { buscarPorBrinco } from '../../api/animais';
import { listarPastos, type Pasto } from '../../api/pastos';
import { Aviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import { centavosDeTexto, formatarReais, textoDeCentavos } from '../../utils/formatadores';
import {
  criarLancamento,
  editarLancamento,
  listarCategorias,
  type CategoriaFinanceira,
  type Lancamento,
  type TipoLancamento,
} from './api';
import { useFinanceiro } from './FinanceiroContext';

// Lançar ou corrigir uma receita ou despesa (spec 003, FR-004, FR-021): cabe
// numa tela de celular, com teclado numérico no valor e a data de hoje.
export function NovoLancamento() {
  const { soConsulta } = useFinanceiro();
  const { id } = useParams<{ id: string }>();
  const [busca] = useSearchParams();
  const navigate = useNavigate();
  // Na correção, o lançamento vem da lista (estado da navegação)
  const existente = (useLocation().state as { lancamento?: Lancamento } | null)?.lancamento;

  const [tipo, setTipo] = useState<TipoLancamento>(
    existente?.tipo ?? (busca.get('tipo') === 'RECEITA' ? 'RECEITA' : 'DESPESA'),
  );
  const [valor, setValor] = useState(existente ? textoDeCentavos(existente.valorCentavos) : '');
  const [data, setData] = useState(existente?.data ?? hojeLocal());
  const [categoriaId, setCategoriaId] = useState(existente?.categoria?.id ?? '');
  const [descricao, setDescricao] = useState(existente?.descricao ?? '');
  const [ligacao, setLigacao] = useState<'NADA' | 'ANIMAL' | 'PASTO'>('NADA');
  const [brinco, setBrinco] = useState('');
  const [pastoId, setPastoId] = useState('');
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    listarCategorias({ tipo })
      .then((lista) => {
        setCategorias(lista);
        setCategoriaId((atual) => (lista.some((c) => c.id === atual) ? atual : ''));
      })
      .catch(() => {});
  }, [tipo]);

  useEffect(() => {
    listarPastos().then(setPastos).catch(() => {});
  }, []);

  if (soConsulta) return <Navigate to="/modulos/financeiro/lancamentos" replace />;
  if (id && !existente) return <Navigate to="/modulos/financeiro/lancamentos" replace />;

  const centavos = centavosDeTexto(valor);

  async function handleSalvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    if (!centavos || centavos <= 0) {
      setErro('Informe um valor maior que zero, por exemplo 1250,00');
      return;
    }
    setEnviando(true);
    try {
      if (existente) {
        await editarLancamento(existente.id, { data, valorCentavos: centavos, categoriaId, descricao });
      } else {
        let animalId: string | undefined;
        if (ligacao === 'ANIMAL' && brinco.trim()) {
          animalId = (await buscarPorBrinco(brinco.trim())).id;
        }
        await criarLancamento({
          tipo,
          data,
          valorCentavos: centavos,
          categoriaId,
          descricao,
          animalId,
          pastoId: ligacao === 'PASTO' && pastoId ? pastoId : undefined,
        });
      }
      navigate(`/modulos/financeiro/lancamentos`, {
        state: {
          aviso: `${tipo === 'RECEITA' ? 'Receita' : 'Despesa'} de ${formatarReais(centavos)} ${existente ? 'corrigida' : 'lançada'}.`,
        },
      });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o lançamento.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <header>
        <h1>{existente ? 'Corrigir lançamento' : tipo === 'RECEITA' ? 'Lançar receita' : 'Lançar despesa'}</h1>
        <Link to="/modulos/financeiro/lancamentos">Lançamentos</Link>
      </header>

      <form onSubmit={handleSalvar}>
        {!existente && (
          <div className="botoes-resultado">
            <button
              type="button"
              className={tipo === 'DESPESA' ? 'resultado ativo-vazia' : 'resultado'}
              aria-pressed={tipo === 'DESPESA'}
              onClick={() => setTipo('DESPESA')}
            >
              Despesa
            </button>
            <button
              type="button"
              className={tipo === 'RECEITA' ? 'resultado ativo-prenhe' : 'resultado'}
              aria-pressed={tipo === 'RECEITA'}
              onClick={() => setTipo('RECEITA')}
            >
              Receita
            </button>
          </div>
        )}
        <div>
          <label htmlFor="valor">Valor (R$)</label>
          <input
            id="valor"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
            autoFocus={!existente}
          />
          {centavos !== null && centavos > 0 && <small>{formatarReais(centavos)}</small>}
        </div>
        <div>
          <label htmlFor="categoria">Categoria</label>
          <select id="categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
            <option value="">Selecione</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="descricao">Descrição</label>
          <input
            id="descricao"
            maxLength={200}
            placeholder={tipo === 'RECEITA' ? 'Ex.: leite vendido na cidade' : 'Ex.: 20 sacos de sal mineral'}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="data">Data</label>
          <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        {!existente && (
          <div>
            <label htmlFor="ligacao">Ligar a (opcional)</label>
            <select id="ligacao" value={ligacao} onChange={(e) => setLigacao(e.target.value as typeof ligacao)}>
              <option value="NADA">Nada</option>
              <option value="ANIMAL">Um animal</option>
              <option value="PASTO">Um pasto</option>
            </select>
          </div>
        )}
        {ligacao === 'ANIMAL' && (
          <div>
            <label htmlFor="brinco">Brinco do animal</label>
            <input id="brinco" inputMode="numeric" value={brinco} onChange={(e) => setBrinco(e.target.value)} />
          </div>
        )}
        {ligacao === 'PASTO' && (
          <div>
            <label htmlFor="pasto">Pasto</label>
            <select id="pasto" value={pastoId} onChange={(e) => setPastoId(e.target.value)}>
              <option value="">Selecione</option>
              {pastos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando...' : existente ? 'Salvar correção' : 'Lançar'}
        </button>
      </form>
    </div>
  );
}
