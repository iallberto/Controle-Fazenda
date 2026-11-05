import { useEffect, useState } from 'react';
import { apiClient, mensagemDeErro } from '../../api/client';
import { useModulos } from '../../contexts/useModulos';
import { editarInsumo, type InsumoEstoque } from './api';

interface Categoria {
  id: string;
  nome: string;
  ativa: boolean;
}

const RACAO = new Set(['SILAGEM', 'RACAO', 'SAL_MINERAL', 'NUCLEO', 'FENO', 'CONCENTRADO']);

// Categoria de despesa do Financeiro para as compras do insumo (spec 006,
// FR-009). Só o dono, com o Financeiro contratado. As categorias vêm da API do
// Financeiro; a Nutrição guarda só o id.
export function CategoriaNoFinanceiro({
  insumo,
  podeEditar,
  aoSalvar,
  aoErro,
}: {
  insumo: InsumoEstoque;
  podeEditar: boolean;
  aoSalvar: () => void;
  aoErro: (texto: string) => void;
}) {
  const { situacaoDe } = useModulos();
  const situacao = situacaoDe('FINANCEIRO')?.situacao ?? 'NAO_CONTRATADO';
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    if (situacao === 'NAO_CONTRATADO') return;
    apiClient
      .get<Categoria[]>('/modulos/financeiro/categorias', { params: { tipo: 'DESPESA' } })
      .then((r) => setCategorias(r.data.filter((c) => c.ativa)))
      .catch(() => setCategorias([]));
  }, [situacao]);

  if (situacao === 'NAO_CONTRATADO' || categorias.length === 0) return null;
  const padrao = RACAO.has(insumo.tipo) ? 'Ração e sal' : 'Outras despesas';

  async function mudar(valor: string) {
    try {
      await editarInsumo(insumo.id, { categoriaDespesaId: valor || null });
      aoSalvar();
    } catch (e) {
      aoErro(mensagemDeErro(e));
    }
  }

  return (
    <section>
      <h2>Categoria no Financeiro</h2>
      <select
        aria-label="Categoria no Financeiro"
        value={insumo.categoriaDespesaId ?? ''}
        disabled={!podeEditar}
        onChange={(e) => mudar(e.target.value)}
      >
        <option value="">Padrão ({padrao})</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      <p className="dica">As compras deste insumo com valor viram despesa nessa categoria, com o Financeiro ativo.</p>
    </section>
  );
}
