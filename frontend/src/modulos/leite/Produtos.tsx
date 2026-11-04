import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { criarProduto, editarProduto, listarProdutos, type ProdutoLeite } from './api';
import { useLeite } from './LeiteContext';

// Produtos com a carência de leite (spec 004, FR-015). Mudar a carência vale
// para os próximos tratamentos; os já gravados ficam com a de antes.
export function Produtos() {
  const { soConsulta } = useLeite();
  const [produtos, setProdutos] = useState<ProdutoLeite[]>([]);
  const [nome, setNome] = useState('');
  const [carencia, setCarencia] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [carenciaEditada, setCarenciaEditada] = useState('');
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    listarProdutos(true)
      .then(setProdutos)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  useEffect(carregar, [carregar]);

  async function cadastrar(evento: FormEvent) {
    evento.preventDefault();
    try {
      await criarProduto({ nome, carenciaLeiteDias: Number(carencia) });
      setAviso({ tipo: 'sucesso', texto: `"${nome}" cadastrado.` });
      setNome('');
      setCarencia('');
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function salvar(produto: ProdutoLeite, dados: Partial<ProdutoLeite>) {
    try {
      await editarProduto(produto.id, dados);
      setEditando(null);
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  return (
    <div>
      <header>
        <h1>Produtos</h1>
      </header>
      <p className="dica">
        A carência de leite do produto é usada nos tratamentos: enquanto ela não passa, o leite da vaca
        é descarte.
      </p>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {!soConsulta && (
        <form onSubmit={cadastrar}>
          <h2>Novo produto</h2>
          <label htmlFor="nome-produto">Nome</label>
          <input
            id="nome-produto"
            value={nome}
            maxLength={80}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <label htmlFor="carencia-produto">Carência de leite (dias; 0 se não tem)</label>
          <input
            id="carencia-produto"
            type="number"
            inputMode="numeric"
            min={0}
            max={120}
            value={carencia}
            onChange={(e) => setCarencia(e.target.value)}
            required
          />
          <button type="submit">Cadastrar</button>
        </form>
      )}

      <ul className="lista-vacas">
        {produtos.map((p) => (
          <li key={p.id} className={p.ativo ? 'cartao-vaca' : 'cartao-vaca cartao-inativo'}>
            <strong>{p.nome}</strong>
            {editando === p.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  salvar(p, { carenciaLeiteDias: Number(carenciaEditada) });
                }}
              >
                <label htmlFor={`carencia-${p.id}`}>Carência (dias)</label>
                <input
                  id={`carencia-${p.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={120}
                  value={carenciaEditada}
                  onChange={(e) => setCarenciaEditada(e.target.value)}
                  required
                />
                <button type="submit">Salvar</button>
                <button type="button" className="botao-secundario" onClick={() => setEditando(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <span>
                  {p.carenciaLeiteDias === 0 ? 'Sem carência' : `Carência de ${p.carenciaLeiteDias} dias`}
                  {!p.ativo && ' · desativado'}
                </span>
                {!soConsulta && (
                  <div className="acoes-marcacao">
                    <button
                      type="button"
                      className="botao-secundario"
                      onClick={() => {
                        setEditando(p.id);
                        setCarenciaEditada(String(p.carenciaLeiteDias));
                      }}
                    >
                      Mudar carência
                    </button>
                    <button type="button" className="botao-secundario" onClick={() => salvar(p, { ativo: !p.ativo })}>
                      {p.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
