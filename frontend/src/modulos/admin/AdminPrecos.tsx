import { useEffect, useState, type FormEvent } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { centavosDeTexto, formatarReais } from '../../utils/formatadores';
import { buscarPrecos, salvarPrecos, type ItemPlano } from './api';

const ITENS: { item: ItemPlano; rotulo: string }[] = [
  { item: 'PACOTE_INICIAL', rotulo: 'Pacote inicial (rebanho e reprodução)' },
  { item: 'LEITE', rotulo: 'Módulo Leite' },
  { item: 'FINANCEIRO', rotulo: 'Módulo Financeiro' },
  { item: 'NUTRICAO', rotulo: 'Módulo Nutrição' },
];

const paraTexto = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Preços do plano a cada 30 dias (spec 008, R5): pacote inicial + módulos.
// O valor do Pix de cada fazenda é a soma do que ela tem.
export function AdminPrecos() {
  const [valores, setValores] = useState<Record<ItemPlano, string> | null>(null);
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  useEffect(() => {
    document.title = 'Preços · Painel do administrador';
    buscarPrecos()
      .then((p) =>
        setValores(
          Object.fromEntries(ITENS.map(({ item }) => [item, paraTexto(p[item] ?? 0)])) as Record<ItemPlano, string>,
        ),
      )
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!valores) return;
    const centavos = {} as Record<ItemPlano, number>;
    for (const { item, rotulo } of ITENS) {
      const valor = centavosDeTexto(valores[item]);
      if (valor === null) {
        setAviso({ tipo: 'erro', texto: `Preço inválido em ${rotulo}` });
        return;
      }
      centavos[item] = valor;
    }
    try {
      const salvos = await salvarPrecos(centavos);
      setAviso({
        tipo: 'sucesso',
        texto: `Preços salvos. Pacote inicial: ${formatarReais(salvos.PACOTE_INICIAL)} a cada 30 dias.`,
      });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  return (
    <div>
      <header>
        <h1>Preços</h1>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      {valores && (
        <form onSubmit={salvar}>
          <p className="dica">Valores a cada 30 dias. O Pix de cada fazenda soma o pacote inicial e os módulos do plano dela.</p>
          {ITENS.map(({ item, rotulo }) => (
            <div key={item}>
              <label htmlFor={`preco-${item}`}>{rotulo} (R$)</label>
              <input
                id={`preco-${item}`}
                inputMode="decimal"
                value={valores[item]}
                onChange={(e) => setValores({ ...valores, [item]: e.target.value })}
                required
              />
            </div>
          ))}
          <button type="submit">Salvar preços</button>
        </form>
      )}
    </div>
  );
}
