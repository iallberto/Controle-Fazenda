import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { BotaoCancelar } from '../../components/BotaoCancelar';
import { centavosDeTexto, formatarCategoria, formatarData, formatarReais, rotuloBrinco } from '../../utils/formatadores';
import {
  descartarUso,
  informarValorCompra,
  listarComprasSemValor,
  listarUsos,
  valorarUso,
  type CompraSemValor,
  type RegistroUso,
} from './api';
import { useFinanceiro } from './FinanceiroContext';
import { formatarQuantidade } from './meses';

// Pendências do dono (spec 003, FR-016c, FR-024): usos dos funcionários que
// esperam o valor e animais comprados cadastrados sem valor.
export function Pendencias() {
  const { soConsulta } = useFinanceiro();
  const [usos, setUsos] = useState<RegistroUso[]>([]);
  const [compras, setCompras] = useState<CompraSemValor[]>([]);
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [carregado, setCarregado] = useState(false);

  const carregar = useCallback(() => {
    Promise.all([listarUsos('AGUARDANDO'), listarComprasSemValor()])
      .then(([u, c]) => {
        setUsos(u);
        setCompras(c);
        setCarregado(true);
      })
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(acao: () => Promise<void>, sucesso: string) {
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

  return (
    <div>
      <header>
        <h1>Pendências</h1>
      </header>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <section>
        <h2>Animais comprados sem valor ({compras.length})</h2>
        {carregado && compras.length === 0 && <p>Nenhuma compra sem valor.</p>}
        <ul className="lista-lancamentos">
          {compras.map((compra) => (
            <li key={compra.animalId}>
              <span>
                <Link to={`/animais/${compra.animalId}`}>{rotuloBrinco(compra.brinco)}</Link> ·{' '}
                {formatarCategoria(compra.categoria)}
                <br />
                <small>
                  {compra.dataCompra ? `comprado em ${formatarData(compra.dataCompra)}` : 'sem data de compra'}
                  {compra.procedencia && ` · de ${compra.procedencia}`}
                  {compra.cadastradoPor && ` · cadastrado por ${compra.cadastradoPor}`}
                </small>
              </span>
              {!soConsulta && (
                <CampoValor
                  rotulo={`Valor de compra do ${rotuloBrinco(compra.brinco)}`}
                  aceitaZero
                  aoConfirmar={(centavos) =>
                    executar(
                      () => informarValorCompra(compra.animalId, centavos),
                      centavos > 0
                        ? `Compra do ${rotuloBrinco(compra.brinco)} lançada: ${formatarReais(centavos)}.`
                        : `${rotuloBrinco(compra.brinco)} sai da lista sem lançar valor.`,
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Usos aguardando valor ({usos.length})</h2>
        {carregado && usos.length === 0 && <p>Nenhum uso aguardando valor.</p>}
        <ul className="lista-lancamentos">
          {usos.map((uso) => (
            <li key={uso.id}>
              <span>
                <strong>
                  {uso.item} — {formatarQuantidade(uso.quantidade)} {uso.unidade}
                </strong>
                <br />
                <small>
                  {formatarData(uso.data)} · {uso.categoria}
                  {uso.registradoPor && ` · por ${uso.registradoPor}`}
                </small>
              </span>
              {!soConsulta && (
                <span className="acoes-lancamento">
                  <CampoValor
                    rotulo={`Valor de ${uso.item}`}
                    aoConfirmar={(centavos) =>
                      executar(
                        () => valorarUso(uso.id, centavos),
                        `${uso.item}: despesa de ${formatarReais(centavos)} lançada.`,
                      )
                    }
                  />
                  <BotaoCancelar
                    aoConfirmar={(motivo) => executar(() => descartarUso(uso.id, motivo), `${uso.item} descartado.`)}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CampoValor({
  rotulo,
  aceitaZero = false,
  aoConfirmar,
}: {
  rotulo: string;
  aceitaZero?: boolean;
  aoConfirmar: (centavos: number) => Promise<boolean>;
}) {
  const [texto, setTexto] = useState('');
  const centavos = centavosDeTexto(texto);
  const valido = centavos !== null && (aceitaZero ? centavos >= 0 : centavos > 0);
  return (
    <span className="cancelar-inline">
      <input
        aria-label={rotulo}
        inputMode="decimal"
        placeholder={aceitaZero ? 'R$ (0,00 para não lançar)' : 'R$'}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <button
        type="button"
        disabled={!valido}
        onClick={async () => {
          if (valido && (await aoConfirmar(centavos!))) setTexto('');
        }}
      >
        Lançar
      </button>
    </span>
  );
}
