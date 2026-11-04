import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { formatarData } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import {
  buscarTurno,
  formatarLitros,
  gravarOrdenhaTanque,
  gravarOrdenhaVaca,
  litrosDeTexto,
  type Turno,
  type VacaDoTurno,
} from './api';
import { useLeite } from './LeiteContext';

const LIMITE_CONFIRMAR = 80;

const paraTexto = (litros: number | null) =>
  litros === null ? '' : String(litros).replace('.', ',');

// Próxima vaca sem lançamento e não pulada, depois da posição dada (volta ao início)
function proximaPendente(depoisDe: number, lista: VacaDoTurno[], puladas: Set<string>) {
  for (let passo = 1; passo <= lista.length; passo++) {
    const i = (depoisDe + passo) % lista.length;
    if (lista[i].litros === null && !puladas.has(lista[i].animalId)) return i;
  }
  return -1;
}

// Ordenha no curral (spec 004, FR-010 a FR-012a, FR-017; research R12): uma vaca
// por vez em destaque, teclado numérico e foco automático; cada vaca é gravada
// na hora ("Gravar e próxima"), para não perder nada se o sinal cair. No modo
// só tanque, as vacas em carência vêm primeiro, uma a uma, e depois o tanque.
export function Ordenha() {
  const { soConsulta } = useLeite();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [indice, setIndice] = useState(0);
  const [puladas, setPuladas] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  function aplicar(resposta: Turno) {
    setTurno(resposta);
    setPuladas(new Set());
    // Começa na primeira vaca ainda sem lançamento
    const primeira = resposta.vacas.findIndex((v) => v.litros === null);
    setIndice(primeira === -1 ? 0 : primeira);
  }

  function carregar(filtro: { data: string; turno?: number }) {
    buscarTurno(filtro)
      .then(aplicar)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }

  useEffect(() => {
    // Hoje e o turno da hora (escolhido pelo servidor)
    buscarTurno({ data: hojeLocal() })
      .then(aplicar)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
  }, []);

  const vacas = turno?.vacas ?? [];
  const atual: VacaDoTurno | undefined = vacas[indice];

  function aoGravar(vaca: VacaDoTurno, salvo: { litros: number; descarte: boolean }) {
    if (!turno) return;
    const lista = vacas.map((v) =>
      v.animalId === vaca.animalId ? { ...v, litros: salvo.litros, descarte: salvo.descarte } : v,
    );
    const semPulada = new Set(puladas);
    semPulada.delete(vaca.animalId);
    setTurno({ ...turno, vacas: lista });
    setPuladas(semPulada);
    setAviso({
      tipo: 'sucesso',
      texto: `Brinco ${vaca.brinco}: ${formatarLitros(salvo.litros)}${salvo.descarte ? ' (descarte)' : ''}`,
    });
    const proxima = proximaPendente(indice, lista, semPulada);
    if (proxima !== -1) setIndice(proxima);
  }

  function pular() {
    if (!atual) return;
    const novas = new Set(puladas).add(atual.animalId);
    setPuladas(novas);
    const proxima = proximaPendente(indice, vacas, novas);
    if (proxima !== -1) setIndice(proxima);
  }

  const lancadas = vacas.filter((v) => v.litros !== null).length;
  const totalTurno = Math.round(vacas.reduce((s, v) => s + (v.litros ?? 0), 0) * 10) / 10;
  const modoTanque = turno?.modo === 'TANQUE';

  return (
    <div className="ordenha">
      <header>
        <h1>Ordenha</h1>
        {turno && <Link to={`/modulos/leite/ordenha/dia?data=${turno.data}`}>Ver o dia</Link>}
      </header>

      {turno && (
        <div className="ordenha-filtros">
          <label>
            Data
            <input
              type="date"
              value={turno.data}
              max={hojeLocal()}
              onChange={(e) => e.target.value && carregar({ data: e.target.value, turno: turno.turno })}
            />
          </label>
          <div className="ordenha-turnos" role="group" aria-label="Turno">
            {Array.from({ length: turno.ordenhasPorDia }, (_, i) => i + 1).map((t) => (
              <button
                key={t}
                type="button"
                className={t === turno.turno ? 'turno-ativo' : 'botao-secundario'}
                aria-pressed={t === turno.turno}
                onClick={() => carregar({ data: turno.data, turno: t })}
              >
                {t}º turno
              </button>
            ))}
          </div>
        </div>
      )}

      {soConsulta && (
        <Aviso tipo="atencao">Módulo desativado: só consulta · fale com o suporte para reativar</Aviso>
      )}
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {turno && !modoTanque && vacas.length === 0 && (
        <section>
          <p>Nenhuma vaca em lactação em {formatarData(turno.data)}.</p>
          <Link className="botao" to="/modulos/leite/vacas?situacao=TODAS">
            Incluir vaca em lactação
          </Link>
        </section>
      )}

      {turno && modoTanque && vacas.length > 0 && (
        <p className="dica">Separe o leite destas vacas e lance os litros de cada uma antes do tanque.</p>
      )}

      {turno && atual && (
        <FormularioVaca
          key={`${turno.data}-${turno.turno}-${atual.animalId}`}
          turno={turno}
          vaca={atual}
          posicao={indice + 1}
          total={vacas.length}
          soConsulta={soConsulta}
          aoGravar={(salvo) => aoGravar(atual, salvo)}
          aoErro={(texto) => setAviso({ tipo: 'erro', texto })}
          aoPular={pular}
        />
      )}

      {turno && modoTanque && (
        <FormularioTanque
          key={`${turno.data}-${turno.turno}`}
          turno={turno}
          soConsulta={soConsulta}
          aoGravar={(litros) => {
            setTurno({ ...turno, tanque: litros });
            setAviso({ tipo: 'sucesso', texto: `Tanque do ${turno.turno}º turno: ${formatarLitros(litros)}` });
          }}
          aoErro={(texto) => setAviso({ tipo: 'erro', texto })}
        />
      )}

      {vacas.length > 0 && (
        <section>
          <h2>
            {lancadas} de {vacas.length} lançadas · {formatarLitros(totalTurno)}
          </h2>
          <ul className="ordenha-lista">
            {vacas.map((v, i) => (
              <li key={v.animalId}>
                <button
                  type="button"
                  className={[
                    'ordenha-item',
                    i === indice ? 'ordenha-item-atual' : '',
                    v.carenciaAte ? 'ordenha-item-descarte' : '',
                  ].join(' ')}
                  onClick={() => setIndice(i)}
                >
                  <span>Brinco {v.brinco}</span>
                  <span>
                    {v.litros !== null
                      ? formatarLitros(v.litros)
                      : puladas.has(v.animalId)
                        ? 'pulada'
                        : 'faltando'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// Uma vaca em destaque; o `key` do pai recria o formulário a cada vaca
function FormularioVaca({
  turno,
  vaca,
  posicao,
  total,
  soConsulta,
  aoGravar,
  aoErro,
  aoPular,
}: {
  turno: Turno;
  vaca: VacaDoTurno;
  posicao: number;
  total: number;
  soConsulta: boolean;
  aoGravar: (salvo: { litros: number; descarte: boolean }) => void;
  aoErro: (texto: string) => void;
  aoPular: () => void;
}) {
  const [texto, setTexto] = useState(paraTexto(vaca.litros));
  const [confirmarAcima, setConfirmarAcima] = useState(false);
  const [gravando, setGravando] = useState(false);

  async function gravar(evento: FormEvent) {
    evento.preventDefault();
    const litros = litrosDeTexto(texto);
    if (litros === null || litros < 0) {
      aoErro('Informe os litros (ex.: 12,5).');
      return;
    }
    if (litros > LIMITE_CONFIRMAR && !confirmarAcima) {
      setConfirmarAcima(true);
      return;
    }
    setGravando(true);
    try {
      const salvo = await gravarOrdenhaVaca({
        data: turno.data,
        turno: turno.turno,
        animalId: vaca.animalId,
        litros,
        confirmarAcima: litros > LIMITE_CONFIRMAR,
      });
      aoGravar(salvo);
    } catch (e) {
      aoErro(mensagemDeErro(e, 'Não foi possível gravar a ordenha.'));
    } finally {
      setGravando(false);
    }
  }

  return (
    <form className="ordenha-vaca" onSubmit={gravar}>
      <p className="ordenha-posicao">
        Vaca {posicao} de {total}
      </p>
      <p className="ordenha-brinco">Brinco {vaca.brinco}</p>
      <p className="ordenha-info">
        {vaca.raca ? `${vaca.raca} · ` : ''}DEL {vaca.del}
        {vaca.litrosAnterior !== null && ` · anterior ${formatarLitros(vaca.litrosAnterior)}`}
      </p>
      {vaca.carenciaAte && (
        <p className="faixa-descarte" role="alert">
          Leite descarte até {formatarData(vaca.carenciaAte)} · não vai para o tanque
        </p>
      )}
      <label htmlFor="litros">Litros</label>
      <input
        id="litros"
        className="ordenha-litros"
        inputMode="decimal"
        autoComplete="off"
        autoFocus
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setConfirmarAcima(false);
        }}
        disabled={soConsulta}
        placeholder="0,0"
      />
      {confirmarAcima && (
        <Aviso tipo="atencao">{texto} litros numa ordenha é muito. Toque em "Confirmar" se estiver certo.</Aviso>
      )}
      {!soConsulta && (
        <div className="ordenha-acoes">
          <button type="submit" disabled={gravando}>
            {confirmarAcima ? 'Confirmar' : 'Gravar e próxima'}
          </button>
          <button type="button" className="botao-secundario" onClick={aoPular}>
            Pular
          </button>
        </div>
      )}
    </form>
  );
}

function FormularioTanque({
  turno,
  soConsulta,
  aoGravar,
  aoErro,
}: {
  turno: Turno;
  soConsulta: boolean;
  aoGravar: (litros: number) => void;
  aoErro: (texto: string) => void;
}) {
  const [texto, setTexto] = useState(paraTexto(turno.tanque));

  async function gravar(evento: FormEvent) {
    evento.preventDefault();
    const litros = litrosDeTexto(texto);
    if (litros === null || litros < 0) {
      aoErro('Informe os litros do tanque.');
      return;
    }
    try {
      const salvo = await gravarOrdenhaTanque({ data: turno.data, turno: turno.turno, litros });
      aoGravar(salvo.litros);
    } catch (e) {
      aoErro(mensagemDeErro(e, 'Não foi possível gravar o tanque.'));
    }
  }

  return (
    <form className="ordenha-vaca" onSubmit={gravar}>
      <label htmlFor="tanque">Litros do tanque · {turno.turno}º turno</label>
      <input
        id="tanque"
        className="ordenha-litros"
        inputMode="decimal"
        autoComplete="off"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={soConsulta}
        placeholder="0,0"
      />
      {!soConsulta && <button type="submit">Gravar tanque</button>}
    </form>
  );
}
