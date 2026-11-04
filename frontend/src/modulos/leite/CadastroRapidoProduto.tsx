import { useState, type FormEvent } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { criarProduto, type ProdutoLeite } from './api';

// Cadastro rápido do produto que ainda não está no cadastro (FR-015a)
export function CadastroRapidoProduto({
  nome: nomeInicial,
  aoCancelar,
  aoCadastrar,
}: {
  nome: string;
  aoCancelar: () => void;
  aoCadastrar: (produto: ProdutoLeite) => Promise<void>;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [carencia, setCarencia] = useState('');
  const [erro, setErro] = useState('');

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    evento.stopPropagation();
    setErro('');
    try {
      const produto = await criarProduto({ nome, carenciaLeiteDias: Number(carencia) });
      await aoCadastrar(produto);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível cadastrar o produto.'));
    }
  }

  return (
    <div className="cadastro-rapido" role="dialog" aria-modal="true" aria-labelledby="titulo-produto">
      <form onSubmit={salvar}>
        <h2 id="titulo-produto">Cadastrar produto</h2>
        <p>
          Com o Leite, todo produto dado a uma fêmea precisa estar no cadastro, com a carência de leite.
        </p>
        <label htmlFor="cadastro-nome">Nome</label>
        <input id="cadastro-nome" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} required />
        <label htmlFor="cadastro-carencia">Carência de leite (dias; 0 se não tem)</label>
        <input
          id="cadastro-carencia"
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          value={carencia}
          onChange={(e) => setCarencia(e.target.value)}
          autoFocus
          required
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit">Cadastrar e salvar o tratamento</button>
        <button type="button" className="botao-secundario" onClick={aoCancelar}>
          Cancelar
        </button>
      </form>
    </div>
  );
}
