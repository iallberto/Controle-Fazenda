import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { centavosDeTexto } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import {
  lancarBaixa,
  lancarEntrada,
  listarInsumos,
  numeroDeTexto,
  type InsumoEstoque,
  type MotivoBaixa,
  type MotivoEntrada,
} from './api';
import { useNutricao } from './NutricaoContext';

// Entrada ou baixa avulsa (spec 005, FR-005, FR-006): a quantidade vai na
// unidade escolhida e o sistema converte. Valor só para o dono.
export function Movimento() {
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const tipo = parametros.get('tipo') === 'BAIXA' ? 'BAIXA' : 'ENTRADA';
  const { ehDono } = useNutricao();
  const [insumos, setInsumos] = useState<InsumoEstoque[]>([]);
  const [insumoId, setInsumoId] = useState(parametros.get('insumo') ?? '');
  const [unidadeId, setUnidadeId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [data, setData] = useState(hojeLocal());
  const [motivoEntrada, setMotivoEntrada] = useState<MotivoEntrada>('COMPRA');
  const [motivoBaixa, setMotivoBaixa] = useState<MotivoBaixa>('PERDA');
  const [fornecedor, setFornecedor] = useState('');
  const [observacao, setObservacao] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarInsumos()
      .then(setInsumos)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  const insumo = insumos.find((i) => i.id === insumoId) ?? null;
  const unidades = useMemo(() => insumo?.unidades.filter((u) => u.ativa) ?? [], [insumo]);
  // Padrão: a unidade de compra na entrada; a base (fator 1) na baixa
  const unidadeEscolhida =
    unidades.find((u) => u.id === unidadeId) ??
    (tipo === 'ENTRADA' ? unidades.find((u) => u.id === insumo?.unidadeCompraId) : undefined) ??
    unidades.find((u) => u.fator === 1) ??
    unidades[0];

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    const numero = numeroDeTexto(quantidade);
    if (!insumo || !unidadeEscolhida || !numero || numero <= 0) {
      setErro('Escolha o insumo e informe a quantidade.');
      return;
    }
    try {
      if (tipo === 'ENTRADA') {
        const centavos = ehDono && valor ? centavosDeTexto(valor) : null;
        await lancarEntrada({
          insumoId: insumo.id,
          data,
          quantidade: numero,
          unidadeId: unidadeEscolhida.id,
          motivo: motivoEntrada,
          fornecedor: fornecedor || undefined,
          observacao: observacao || undefined,
          valorCentavos: centavos ?? undefined,
        });
      } else {
        await lancarBaixa({
          insumoId: insumo.id,
          data,
          quantidade: numero,
          unidadeId: unidadeEscolhida.id,
          motivo: motivoBaixa,
          observacao: observacao || undefined,
        });
      }
      navigate(`/modulos/nutricao/insumos/${insumo.id}`);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível lançar.'));
    }
  }

  return (
    <div>
      <header>
        <h1>{tipo === 'ENTRADA' ? 'Lançar entrada' : 'Dar baixa'}</h1>
        <Link to="/modulos/nutricao/estoque">Estoque</Link>
      </header>
      <div className="nav-modulo" role="group" aria-label="Tipo">
        {(['ENTRADA', 'BAIXA'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={t === tipo ? 'turno-ativo' : 'botao-secundario'}
            aria-pressed={t === tipo}
            onClick={() => setParametros({ tipo: t, ...(insumoId ? { insumo: insumoId } : {}) })}
          >
            {t === 'ENTRADA' ? 'Entrada' : 'Baixa'}
          </button>
        ))}
      </div>
      <form onSubmit={salvar}>
        <label htmlFor="insumo">Insumo</label>
        <select
          id="insumo"
          value={insumoId}
          onChange={(e) => {
            setInsumoId(e.target.value);
            setUnidadeId('');
          }}
          required
        >
          <option value="">Escolha o insumo</option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
        <div className="linha-quantidade">
          <div>
            <label htmlFor="quantidade">Quantidade</label>
            <input
              id="quantidade"
              inputMode="decimal"
              autoComplete="off"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="unidade">Unidade</label>
            <select
              id="unidade"
              value={unidadeEscolhida?.id ?? ''}
              onChange={(e) => setUnidadeId(e.target.value)}
              disabled={!insumo}
            >
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="data">Data</label>
        <input id="data" type="date" value={data} max={hojeLocal()} onChange={(e) => setData(e.target.value)} required />
        {tipo === 'ENTRADA' ? (
          <>
            <label htmlFor="motivo-entrada">Origem</label>
            <select id="motivo-entrada" value={motivoEntrada} onChange={(e) => setMotivoEntrada(e.target.value as MotivoEntrada)}>
              <option value="COMPRA">Compra</option>
              <option value="PRODUCAO">Produção própria</option>
            </select>
            <label htmlFor="fornecedor">Fornecedor (opcional)</label>
            <input id="fornecedor" value={fornecedor} maxLength={120} onChange={(e) => setFornecedor(e.target.value)} />
            {ehDono ? (
              <>
                <label htmlFor="valor">Valor total pago (opcional)</label>
                <input id="valor" inputMode="decimal" placeholder="R$ 0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
              </>
            ) : (
              <p className="dica">O valor da compra é informado pelo dono.</p>
            )}
          </>
        ) : (
          <>
            <label htmlFor="motivo-baixa">Motivo</label>
            <select id="motivo-baixa" value={motivoBaixa} onChange={(e) => setMotivoBaixa(e.target.value as MotivoBaixa)}>
              <option value="PERDA">Perda</option>
              <option value="ESTRAGO">Estrago</option>
              <option value="DOACAO">Doação</option>
              <option value="OUTRO">Outro</option>
            </select>
          </>
        )}
        <label htmlFor="observacao">Observação{tipo === 'BAIXA' && motivoBaixa === 'OUTRO' ? '' : ' (opcional)'}</label>
        <input
          id="observacao"
          value={observacao}
          maxLength={200}
          onChange={(e) => setObservacao(e.target.value)}
          required={tipo === 'BAIXA' && motivoBaixa === 'OUTRO'}
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit">{tipo === 'ENTRADA' ? 'Lançar entrada' : 'Dar baixa'}</button>
      </form>
    </div>
  );
}
