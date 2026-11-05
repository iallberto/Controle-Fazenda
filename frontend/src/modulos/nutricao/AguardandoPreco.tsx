import { useCallback, useEffect, useState } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { centavosDeTexto, formatarData } from '../../utils/formatadores';
import { formatarQuantidade, informarPrecoEntrada, listarAguardandoPreco, type EntradaAguardando } from './api';

// Entradas lançadas sem valor, para o dono informar (spec 005, FR-021)
export function AguardandoPreco() {
  const [entradas, setEntradas] = useState<EntradaAguardando[] | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    listarAguardandoPreco()
      .then(setEntradas)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  useEffect(carregar, [carregar]);

  async function salvar(entrada: EntradaAguardando) {
    const centavos = centavosDeTexto(valores[entrada.id] ?? '');
    if (!centavos) {
      setAviso({ tipo: 'erro', texto: 'Informe o valor total pago (ex.: 3.200,00).' });
      return;
    }
    try {
      await informarPrecoEntrada(entrada.id, centavos);
      setAviso({ tipo: 'sucesso', texto: `Preço de ${entrada.insumo} informado.` });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  return (
    <div>
      <header>
        <h1>Aguardando preço</h1>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {entradas && entradas.length === 0 && <p>Nenhuma entrada aguardando preço.</p>}
      <ul className="lista-vacas">
        {entradas?.map((e) => (
          <li key={e.id} className="cartao-vaca">
            <strong>
              {e.insumo} · {formatarQuantidade(e.quantidade, e.unidade)}
            </strong>
            <span>
              {formatarData(e.data)}
              {e.fornecedor && ` · ${e.fornecedor}`}
            </span>
            <label htmlFor={`valor-${e.id}`}>Valor total pago</label>
            <input
              id={`valor-${e.id}`}
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={valores[e.id] ?? ''}
              onChange={(ev) => setValores({ ...valores, [e.id]: ev.target.value })}
            />
            <button type="button" onClick={() => salvar(e)}>
              Salvar preço
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
