import { useEffect, useState } from 'react';
import { useModulos } from '../../contexts/useModulos';
import { CadastroRapidoProduto } from './CadastroRapidoProduto';
import { codigoDoErro, listarProdutos, type ProdutoLeite } from './api';

const ID_LISTA = 'produtos-leite';

// Produto do tratamento com o Leite ativo (spec 004, FR-015a; research R6):
// - `atributosDoCampo` liga o campo "Produto" à lista do cadastro;
// - `enviar(acao, produto)` grava o tratamento; se o backend responder
//   PRODUTO_SEM_CADASTRO, abre o cadastro rápido (nome preenchido, carência)
//   e repete a gravação depois de cadastrar.
// Sem o Leite ativo, o campo continua livre e nada muda.
export function useProdutoComCarencia() {
  const { situacaoDe } = useModulos();
  const ativo = situacaoDe('LEITE')?.situacao === 'ATIVO';
  const [produtos, setProdutos] = useState<ProdutoLeite[]>([]);
  const [pendente, setPendente] = useState<{ nome: string; repetir: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!ativo) return;
    listarProdutos()
      .then(setProdutos)
      .catch(() => setProdutos([]));
  }, [ativo]);

  async function enviar(acao: () => Promise<void>, produto: string) {
    try {
      await acao();
    } catch (erro) {
      if (ativo && codigoDoErro(erro) === 'PRODUTO_SEM_CADASTRO') {
        setPendente({ nome: produto.trim(), repetir: acao });
        return;
      }
      throw erro;
    }
  }

  const atributosDoCampo = ativo ? { list: ID_LISTA, autoComplete: 'off' } : {};

  const elementos = (
    <>
      {ativo && (
        <datalist id={ID_LISTA}>
          {produtos.map((p) => (
            <option key={p.id} value={p.nome}>
              {p.carenciaLeiteDias > 0 ? `carência ${p.carenciaLeiteDias} dias` : 'sem carência'}
            </option>
          ))}
        </datalist>
      )}
      {pendente && (
        <CadastroRapidoProduto
          nome={pendente.nome}
          aoCancelar={() => setPendente(null)}
          aoCadastrar={async (produto) => {
            setProdutos([...produtos, produto]);
            const repetir = pendente.repetir;
            setPendente(null);
            await repetir();
          }}
        />
      )}
    </>
  );

  return { leiteAtivo: ativo, atributosDoCampo, enviar, elementos };
}
