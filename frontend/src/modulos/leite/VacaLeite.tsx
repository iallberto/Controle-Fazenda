import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { formatarData } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import {
  alterarVacaDeLeite,
  buscarVaca,
  cancelarSecagem,
  registrarSecagem,
  formatarLitros,
  iniciarLactacao,
  type VacaDeLeite,
  type VacaDetalhe,
} from './api';
import { useLeite } from './LeiteContext';

const ROTULO_VACA_DE_LEITE: Record<VacaDeLeite, string> = {
  PELA_RACA: 'Pela raça',
  SIM: 'Sim',
  NAO: 'Não',
};

const MOTIVO_FIM: Record<VacaDetalhe['encerradas'][number]['motivoFim'], string> = {
  SECAGEM: 'secagem',
  SAIDA: 'saída do rebanho',
  NOVO_PARTO: 'novo parto',
};

// A vaca no Leite (spec 004, US1): situação, DEL, lactação atual e anteriores;
// iniciar a lactação à mão (FR-006) e, para o dono, "vaca de leite" (FR-004b)
export function VacaLeite() {
  const { animalId = '' } = useParams<{ animalId: string }>();
  const { soConsulta, ehDono } = useLeite();
  const [vaca, setVaca] = useState<VacaDetalhe | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [inicio, setInicio] = useState(hojeLocal());
  const [dataSecagem, setDataSecagem] = useState(hojeLocal());

  const carregar = useCallback(() => {
    buscarVaca(animalId)
      .then(setVaca)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [animalId]);

  useEffect(carregar, [carregar]);

  async function mudarVacaDeLeite(valor: VacaDeLeite) {
    try {
      setVaca(await alterarVacaDeLeite(animalId, valor));
      setAviso({ tipo: 'sucesso', texto: 'Vaca de leite atualizada.' });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function iniciar(evento: FormEvent, partoId?: string, data?: string) {
    evento.preventDefault();
    try {
      await iniciarLactacao({ animalId, inicio: data ?? inicio, partoId });
      setAviso({ tipo: 'sucesso', texto: 'Lactação iniciada. A vaca já aparece na ordenha.' });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function secar(evento: FormEvent) {
    evento.preventDefault();
    try {
      await registrarSecagem({ animalId, data: dataSecagem });
      setAviso({ tipo: 'sucesso', texto: 'Secagem registrada. A vaca saiu da ordenha.' });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function desfazerSecagem(id: string) {
    const motivo = window.prompt('Motivo do cancelamento da secagem');
    if (!motivo) return;
    try {
      await cancelarSecagem(id, motivo);
      setAviso({ tipo: 'sucesso', texto: 'Secagem cancelada. A vaca voltou à ordenha.' });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>;
  if (!vaca) return <p>Carregando...</p>;
  const atual = vaca.lactacaoAtual;

  return (
    <div>
      <header>
        <h1>Brinco {vaca.brinco}</h1>
        <Link to={`/animais/${vaca.animalId}`}>Página do animal</Link>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <section>
        <p>Raça: {vaca.raca ?? 'não informada'}{vaca.racaLeiteira ? ' (leiteira)' : ''}</p>
        <p>
          Situação:{' '}
          {vaca.situacao === 'EM_LACTACAO'
            ? 'em lactação'
            : vaca.situacao === 'SECA'
              ? 'seca'
              : 'sem lactação registrada'}
        </p>
        {vaca.carenciaAte && (
          <p className="faixa-descarte">Leite descarte até {formatarData(vaca.carenciaAte)}</p>
        )}
        {!vaca.ehVacaDeLeite && (
          <p className="dica">Esta vaca não é de leite: o parto dela não abre lactação.</p>
        )}
      </section>

      {ehDono && !soConsulta && (
        <section>
          <h2>Vaca de leite</h2>
          <div className="nav-modulo" role="group" aria-label="Vaca de leite">
            {(Object.keys(ROTULO_VACA_DE_LEITE) as VacaDeLeite[]).map((valor) => (
              <button
                key={valor}
                type="button"
                className={vaca.vacaDeLeite === valor ? 'turno-ativo' : 'botao-secundario'}
                aria-pressed={vaca.vacaDeLeite === valor}
                onClick={() => mudarVacaDeLeite(valor)}
              >
                {ROTULO_VACA_DE_LEITE[valor]}
              </button>
            ))}
          </div>
          <p className="dica">"Pela raça" segue a raça; "Sim" e "Não" valem para esta vaca.</p>
        </section>
      )}

      {atual ? (
        <section>
          <h2>Lactação atual</h2>
          <dl className="resumo-mes">
            <dt>Início</dt>
            <dd>{formatarData(atual.inicio)}</dd>
            <dt>DEL</dt>
            <dd>{atual.del} dias</dd>
            <dt>Total</dt>
            <dd>{formatarLitros(atual.totalLitros)}</dd>
            <dt>Média por dia</dt>
            <dd>{formatarLitros(atual.mediaPorDia)}</dd>
            <dt>Pico</dt>
            <dd>{formatarLitros(atual.pico)}</dd>
            {atual.partoPrevisto && (
              <>
                <dt>Parto previsto</dt>
                <dd>{formatarData(atual.partoPrevisto)}</dd>
              </>
            )}
            {atual.secagemPlanejada && (
              <>
                <dt>Secar em</dt>
                <dd className={atual.secagemPlanejada < hojeLocal() ? 'valor-despesa' : undefined}>
                  {formatarData(atual.secagemPlanejada)}
                </dd>
              </>
            )}
          </dl>
          {!soConsulta && (
            <form onSubmit={secar}>
              <h3>Registrar secagem</h3>
              <label htmlFor="data-secagem">Data da secagem</label>
              <input
                id="data-secagem"
                type="date"
                value={dataSecagem}
                min={atual.inicio}
                max={hojeLocal()}
                onChange={(e) => setDataSecagem(e.target.value)}
                required
              />
              <button type="submit">Registrar secagem</button>
            </form>
          )}
        </section>
      ) : (
        vaca.ehVacaDeLeite &&
        !soConsulta && (
          <section>
            <h2>Iniciar lactação</h2>
            {vaca.partoRecente && (
              <form onSubmit={(e) => iniciar(e, vaca.partoRecente!.partoId, vaca.partoRecente!.data)}>
                <p>Pariu em {formatarData(vaca.partoRecente.data)}.</p>
                <button type="submit">Iniciar na data do parto</button>
              </form>
            )}
            <form onSubmit={(e) => iniciar(e)}>
              <label htmlFor="inicio">Data de início</label>
              <input
                id="inicio"
                type="date"
                value={inicio}
                max={hojeLocal()}
                onChange={(e) => setInicio(e.target.value)}
                required
              />
              <button type="submit" className={vaca.partoRecente ? 'botao-secundario' : undefined}>
                Iniciar lactação
              </button>
            </form>
          </section>
        )
      )}

      {vaca.encerradas.length > 0 && (
        <section>
          <h2>Lactações anteriores</h2>
          <ul>
            {vaca.encerradas.map((l) => (
              <li key={l.id}>
                {formatarData(l.inicio)} a {formatarData(l.fim)} · {l.dias} dias ·{' '}
                {formatarLitros(l.totalLitros)} · fim por {MOTIVO_FIM[l.motivoFim]}
                {!soConsulta && !atual && l.secagemId && l.id === vaca.encerradas[0].id && (
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => desfazerSecagem(l.secagemId!)}
                  >
                    Cancelar secagem
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
