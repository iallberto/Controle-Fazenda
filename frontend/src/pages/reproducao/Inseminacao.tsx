import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listarPastos, type Pasto } from '../../api/pastos';
import { listarAplicadores, type Aplicador } from '../../api/usuarios';
import { listarVeterinarios, type Veterinario } from '../../api/veterinarios';
import {
  cancelarInseminacao,
  listarFemeasAptas,
  listarInseminacoes,
  listarSemens,
  registrarInseminacao,
  type FemeaApta,
  type InseminacaoRegistro,
  type Semen,
  type TipoInseminacao,
} from '../../api/reproducao';
import { mensagemDeErro } from '../../api/client';
import { useAuth } from '../../contexts/useAuth';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { BotaoCancelar } from '../../components/BotaoCancelar';
import { hojeLocal } from '../../utils/datas';
import { formatarCategoria, formatarData, rotuloBrinco } from '../../utils/formatadores';

// US5: inseminação de uma fêmea apta (FR-010). Cada registro baixa uma dose do
// sêmen escolhido; só aparecem sêmens com dose em estoque (FR-011).
export function Inseminacao() {
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [semens, setSemens] = useState<Semen[] | null>(null);
  const [aplicadores, setAplicadores] = useState<Aplicador[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);
  const [aptas, setAptas] = useState<FemeaApta[] | null>(null);
  const [recentes, setRecentes] = useState<InseminacaoRegistro[]>([]);

  const [pastoId, setPastoId] = useState('');
  const [femeaId, setFemeaId] = useState('');
  const [data, setData] = useState(hojeLocal);
  const [tipo, setTipo] = useState<TipoInseminacao>('IA');
  const [semenId, setSemenId] = useState('');
  const [aplicadoPorTipo, setAplicadoPorTipo] = useState<'USUARIO' | 'VETERINARIO'>('USUARIO');
  const [aplicadoPorUsuarioId, setAplicadoPorUsuarioId] = useState(usuario?.id ?? '');
  const [aplicadoPorVeterinarioId, setAplicadoPorVeterinarioId] = useState('');

  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [enviando, setEnviando] = useState(false);

  function carregarSemensERecentes() {
    listarSemens()
      .then(setSemens)
      .catch(() => setSemens([]));
    listarInseminacoes()
      .then(setRecentes)
      .catch(() => {});
  }

  useEffect(() => {
    listarPastos().then(setPastos).catch(() => {});
    listarAplicadores().then(setAplicadores).catch(() => {});
    listarVeterinarios()
      .then((lista) => setVeterinarios(lista.filter((v) => v.ativo)))
      .catch(() => {});
    carregarSemensERecentes();
  }, []);

  // A aptidão depende da data (descanso de 45 dias depois do parto)
  useEffect(() => {
    if (!data) return;
    listarFemeasAptas({ pastoId: pastoId || undefined, data })
      .then((lista) => {
        setAptas(lista);
        setFemeaId((atual) => (lista.some((femea) => femea.id === atual) ? atual : ''));
      })
      .catch(() => setAptas([]));
  }, [pastoId, data]);

  const comDoses = semens?.filter((semen) => semen.doses > 0) ?? [];

  async function handleSalvar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    setEnviando(true);
    try {
      await registrarInseminacao({
        femeaId,
        data,
        tipo,
        semenId,
        aplicadoPorTipo,
        aplicadoPorUsuarioId: aplicadoPorTipo === 'USUARIO' ? aplicadoPorUsuarioId : undefined,
        aplicadoPorVeterinarioId: aplicadoPorTipo === 'VETERINARIO' ? aplicadoPorVeterinarioId : undefined,
      });
      const femea = aptas?.find((item) => item.id === femeaId);
      const semen = semens?.find((item) => item.id === semenId);
      setAviso({
        tipo: 'sucesso',
        texto: `Inseminação de ${femea ? rotuloBrinco(femea.brinco) : 'a fêmea'} registrada com ${semen?.nomeTouro ?? 'o sêmen'}.`,
      });
      setFemeaId('');
      carregarSemensERecentes();
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível registrar a inseminação.') });
    } finally {
      setEnviando(false);
    }
  }

  async function handleCancelar(id: string, motivo: string) {
    setAviso(null);
    try {
      await cancelarInseminacao(id, motivo);
      setAviso({ tipo: 'sucesso', texto: 'Inseminação cancelada. A dose voltou ao estoque.' });
      carregarSemensERecentes();
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) });
    }
  }

  return (
    <div>
      <header>
        <h1>Inseminação</h1>
        <Link to="/reproducao/semens">Sêmen e doses</Link>
      </header>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      {semens && comDoses.length === 0 && (
        <Aviso tipo="atencao">
          Nenhum sêmen com doses em estoque. <Link to="/reproducao/semens">Cadastre o sêmen ou dê entrada de doses</Link>{' '}
          antes de registrar a inseminação.
        </Aviso>
      )}

      {comDoses.length > 0 && (
        <form onSubmit={handleSalvar}>
          <div>
            <label htmlFor="data">Data da inseminação</label>
            <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="pasto">Pasto (para filtrar)</label>
            <select id="pasto" value={pastoId} onChange={(e) => setPastoId(e.target.value)}>
              <option value="">Todos os pastos</option>
              {pastos.map((pasto) => (
                <option key={pasto.id} value={pasto.id}>
                  {pasto.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="femea">Fêmea apta</label>
            <select id="femea" value={femeaId} onChange={(e) => setFemeaId(e.target.value)} required>
              <option value="">{aptas && aptas.length === 0 ? 'Nenhuma fêmea apta' : 'Selecione'}</option>
              {aptas?.map((femea) => (
                <option key={femea.id} value={femea.id}>
                  {rotuloBrinco(femea.brinco)} · {formatarCategoria(femea.categoria)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tipo">Tipo</label>
            <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoInseminacao)}>
              <option value="IA">IA (cio observado)</option>
              <option value="IATF">IATF (tempo fixo)</option>
            </select>
          </div>
          <div>
            <label htmlFor="semen">Sêmen</label>
            <select id="semen" value={semenId} onChange={(e) => setSemenId(e.target.value)} required>
              <option value="">Selecione</option>
              {comDoses.map((semen) => (
                <option key={semen.id} value={semen.id}>
                  {semen.nomeTouro} ({semen.doses === 1 ? '1 dose' : `${semen.doses} doses`})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="aplicado-por-tipo">Inseminado por</label>
            <select
              id="aplicado-por-tipo"
              value={aplicadoPorTipo}
              onChange={(e) => setAplicadoPorTipo(e.target.value as 'USUARIO' | 'VETERINARIO')}
            >
              <option value="USUARIO">Funcionário / Dono</option>
              <option value="VETERINARIO">Veterinário</option>
            </select>
          </div>
          {aplicadoPorTipo === 'USUARIO' ? (
            <div>
              <label htmlFor="aplicado-por">Quem inseminou</label>
              <select
                id="aplicado-por"
                value={aplicadoPorUsuarioId}
                onChange={(e) => setAplicadoPorUsuarioId(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {aplicadores.map((aplicador) => (
                  <option key={aplicador.id} value={aplicador.id}>
                    {aplicador.nome}
                    {aplicador.papel === 'DONO' ? ' (dono)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="veterinario">Qual veterinário</label>
              <select
                id="veterinario"
                value={aplicadoPorVeterinarioId}
                onChange={(e) => setAplicadoPorVeterinarioId(e.target.value)}
                required
              >
                <option value="">Selecione</option>
                {veterinarios.map((veterinario) => (
                  <option key={veterinario.id} value={veterinario.id}>
                    {veterinario.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" disabled={enviando}>
            {enviando ? 'Salvando...' : 'Registrar inseminação'}
          </button>
        </form>
      )}

      {recentes.length > 0 && (
        <section>
          <h2>Últimas inseminações</h2>
          <ul>
            {recentes.map((item) => (
              <li key={item.id} className={item.cancelamento.cancelado ? 'cancelado' : undefined}>
                {formatarData(item.data)} ·{' '}
                <Link to={`/animais/${item.femea.id}`}>{rotuloBrinco(item.femea.brinco)}</Link> · {item.tipo} ·{' '}
                {item.semen.nomeTouro}
                {(item.aplicadoPorUsuario || item.aplicadoPorVeterinario) &&
                  ` · por ${item.aplicadoPorUsuario?.nome ?? item.aplicadoPorVeterinario?.nome}`}
                {item.cancelamento.cancelado && ` · cancelada: ${item.cancelamento.motivoCancelamento}`}
                {ehDono && !item.cancelamento.cancelado && (
                  <>
                    {' '}
                    <BotaoCancelar aoConfirmar={(motivo) => handleCancelar(item.id, motivo)} />
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
