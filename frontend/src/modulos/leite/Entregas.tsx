import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { centavosDeTexto, formatarData, formatarReais } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import { mesAtual, nomeDoMes, somarMeses } from '../../utils/meses';
import {
  cancelarEntrega,
  criarEntrega,
  formatarLitros,
  informarPrecoDoMes,
  litrosDeTexto,
  listarEntregas,
  type MesDeEntregas,
} from './api';
import { useLeite } from './LeiteContext';

// Entregas ao laticínio (spec 004, US4, FR-022, FR-023). Todos lançam os
// litros; preço e valores só aparecem para o dono (FR-002).
export function Entregas() {
  const { soConsulta, ehDono } = useLeite();
  const [mes, setMes] = useState(mesAtual());
  const [dados, setDados] = useState<MesDeEntregas | null>(null);
  const [data, setData] = useState(hojeLocal());
  const [litros, setLitros] = useState('');
  const [observacao, setObservacao] = useState('');
  const [preco, setPreco] = useState('');
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const carregar = useCallback(() => {
    listarEntregas(mes)
      .then(setDados)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, [mes]);

  useEffect(carregar, [carregar]);

  async function lancar(evento: FormEvent) {
    evento.preventDefault();
    const valor = litrosDeTexto(litros);
    if (valor === null || valor <= 0) {
      setAviso({ tipo: 'erro', texto: 'Informe os litros entregues.' });
      return;
    }
    try {
      await criarEntrega({ data, litros: valor, observacao: observacao || undefined });
      setAviso({ tipo: 'sucesso', texto: `Entrega de ${formatarLitros(valor)} lançada.` });
      setLitros('');
      setObservacao('');
      if (data.slice(0, 7) === mes) carregar();
      else setMes(data.slice(0, 7));
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function aplicarPreco(evento: FormEvent) {
    evento.preventDefault();
    const centavos = centavosDeTexto(preco);
    if (!centavos) {
      setAviso({ tipo: 'erro', texto: 'Informe o preço por litro (ex.: 2,45).' });
      return;
    }
    try {
      const r = await informarPrecoDoMes(mes, centavos);
      setAviso({ tipo: 'sucesso', texto: `Preço de ${formatarReais(centavos)}/L aplicado a ${r.atualizadas} entrega(s).` });
      setPreco('');
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function cancelar(id: string) {
    const motivo = window.prompt('Motivo do cancelamento da entrega');
    if (!motivo) return;
    try {
      await cancelarEntrega(id, motivo);
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  return (
    <div>
      <header>
        <h1>Entregas</h1>
        <Link to="/modulos/leite/analises">Análises</Link>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {!soConsulta && (
        <form onSubmit={lancar}>
          <h2>Nova entrega</h2>
          <label htmlFor="data-entrega">Data</label>
          <input
            id="data-entrega"
            type="date"
            value={data}
            max={hojeLocal()}
            onChange={(e) => setData(e.target.value)}
            required
          />
          <label htmlFor="litros-entrega">Litros entregues</label>
          <input
            id="litros-entrega"
            inputMode="decimal"
            autoComplete="off"
            value={litros}
            onChange={(e) => setLitros(e.target.value)}
            placeholder="0,0"
            required
          />
          <label htmlFor="obs-entrega">Observação (opcional)</label>
          <input
            id="obs-entrega"
            value={observacao}
            maxLength={200}
            onChange={(e) => setObservacao(e.target.value)}
          />
          <button type="submit">Lançar entrega</button>
        </form>
      )}

      <div className="ordenha-turnos" role="group" aria-label="Mês">
        <button type="button" className="botao-secundario" onClick={() => setMes(somarMeses(mes, -1))}>
          ‹ Anterior
        </button>
        <button
          type="button"
          className="botao-secundario"
          disabled={mes >= mesAtual()}
          onClick={() => setMes(somarMeses(mes, 1))}
        >
          Próximo ›
        </button>
      </div>

      {dados && (
        <section>
          <h2>{nomeDoMes(mes)}</h2>
          <dl className="resumo-mes">
            <dt>Entregue ao laticínio</dt>
            <dd>{formatarLitros(dados.totalLitros)}</dd>
            <dt>Leite para o tanque (ordenha)</dt>
            <dd>{formatarLitros(dados.paraTanque)}</dd>
            <dt>Diferença</dt>
            <dd className={Math.abs(dados.diferenca) > 0.05 * Math.max(dados.totalLitros, 1) ? 'valor-despesa' : undefined}>
              {formatarLitros(dados.diferenca)}
            </dd>
            {ehDono && dados.totalCentavos !== undefined && (
              <>
                <dt>Valor do mês</dt>
                <dd className="valor-receita">{formatarReais(dados.totalCentavos)}</dd>
              </>
            )}
          </dl>
          {ehDono && (dados.entregasSemPreco ?? 0) > 0 && (
            <p className="dica">{dados.entregasSemPreco} entrega(s) ainda sem preço.</p>
          )}

          {ehDono && !soConsulta && dados.entregas.length > 0 && (
            <form onSubmit={aplicarPreco}>
              <label htmlFor="preco-mes">Preço por litro pago no mês</label>
              <input
                id="preco-mes"
                inputMode="decimal"
                autoComplete="off"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="R$ 0,00"
              />
              <button type="submit">Aplicar às entregas do mês</button>
            </form>
          )}

          {dados.entregas.length === 0 ? (
            <p>Nenhuma entrega neste mês.</p>
          ) : (
            <ul className="lista-vacas">
              {dados.entregas.map((e) => (
                <li key={e.id} className={e.cancelamento.cancelado ? 'cartao-vaca cartao-inativo' : 'cartao-vaca'}>
                  <strong>
                    {formatarData(e.data)} · {formatarLitros(e.litros)}
                  </strong>
                  {ehDono && e.precoLitroCentavos != null && (
                    <span>
                      {formatarReais(e.precoLitroCentavos)}/L · {formatarReais(e.valorCentavos)}
                    </span>
                  )}
                  {e.observacao && <span>{e.observacao}</span>}
                  {e.cancelamento.cancelado ? (
                    <span>Cancelada: {e.cancelamento.motivoCancelamento}</span>
                  ) : (
                    !soConsulta && (
                      <button type="button" className="botao-secundario" onClick={() => cancelar(e.id)}>
                        Cancelar entrega
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
