import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import {
  criarCategoria,
  editarCategoria,
  listarCategorias,
  type CategoriaFinanceira,
  type TipoLancamento,
} from './api';
import { useFinanceiro } from './FinanceiroContext';

// Categorias de receita e despesa (spec 003, FR-005, FR-006): as padrão são
// fixas; as da fazenda o dono cria, renomeia e desativa.
export function Categorias() {
  const { soConsulta } = useFinanceiro();
  const [categorias, setCategorias] = useState<CategoriaFinanceira[] | null>(null);
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [tipo, setTipo] = useState<TipoLancamento>('DESPESA');
  const [nome, setNome] = useState('');

  const carregar = useCallback(() => {
    listarCategorias({ incluirInativas: true })
      .then(setCategorias)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setAviso(null);
    try {
      await acao();
      setAviso({ tipo: 'sucesso', texto: sucesso });
      carregar();
      return true;
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
      return false;
    }
  }

  async function handleCriar(evento: FormEvent) {
    evento.preventDefault();
    if (await executar(() => criarCategoria(tipo, nome.trim()), `Categoria "${nome.trim()}" criada.`)) {
      setNome('');
    }
  }

  return (
    <div>
      <header>
        <h1>Categorias</h1>
      </header>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {(['DESPESA', 'RECEITA'] as TipoLancamento[]).map((grupo) => (
        <section key={grupo}>
          <h2>{grupo === 'DESPESA' ? 'Despesas' : 'Receitas'}</h2>
          <ul>
            {categorias
              ?.filter((c) => c.tipo === grupo)
              .map((c) => (
                <ItemCategoria
                  key={c.id}
                  categoria={c}
                  podeMudar={!soConsulta && !c.padrao}
                  aoRenomear={(novo) => executar(() => editarCategoria(c.id, { nome: novo }), 'Categoria renomeada.')}
                  aoAlternar={() =>
                    executar(
                      () => editarCategoria(c.id, { ativa: !c.ativa }),
                      c.ativa ? 'Categoria desativada.' : 'Categoria reativada.',
                    )
                  }
                />
              ))}
          </ul>
        </section>
      ))}

      {!soConsulta && (
        <section>
          <h2>Nova categoria</h2>
          <form onSubmit={handleCriar}>
            <div>
              <label htmlFor="tipo-categoria">Tipo</label>
              <select id="tipo-categoria" value={tipo} onChange={(e) => setTipo(e.target.value as TipoLancamento)}>
                <option value="DESPESA">Despesa</option>
                <option value="RECEITA">Receita</option>
              </select>
            </div>
            <div>
              <label htmlFor="nome-categoria">Nome</label>
              <input id="nome-categoria" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <button type="submit">Criar categoria</button>
          </form>
        </section>
      )}
    </div>
  );
}

function ItemCategoria({
  categoria,
  podeMudar,
  aoRenomear,
  aoAlternar,
}: {
  categoria: CategoriaFinanceira;
  podeMudar: boolean;
  aoRenomear: (nome: string) => Promise<boolean>;
  aoAlternar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(categoria.nome);

  if (editando) {
    return (
      <li>
        <span className="cancelar-inline">
          <input aria-label="Novo nome" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} />
          <button
            type="button"
            disabled={!nome.trim()}
            onClick={async () => {
              if (await aoRenomear(nome.trim())) setEditando(false);
            }}
          >
            Salvar
          </button>
          <button type="button" className="botao-link" onClick={() => setEditando(false)}>
            Voltar
          </button>
        </span>
      </li>
    );
  }

  return (
    <li className={categoria.ativa ? undefined : 'cancelado'}>
      {categoria.nome}
      {categoria.padrao && <small> · padrão</small>}
      {!categoria.ativa && <small> · desativada</small>}
      {podeMudar && (
        <>
          {' '}
          <button type="button" className="botao-link" onClick={() => setEditando(true)}>
            Renomear
          </button>{' '}
          <button type="button" className="botao-link" onClick={aoAlternar}>
            {categoria.ativa ? 'Desativar' : 'Reativar'}
          </button>
        </>
      )}
    </li>
  );
}
