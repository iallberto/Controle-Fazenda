import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { buscarConfiguracao, salvarConfiguracao, type ConfiguracaoLeite as Config } from './api';
import { useLeite } from './LeiteContext';

interface RacaDaFazenda {
  id: string;
  nome: string;
  fazendaId: string | null;
  leiteira: boolean;
}

// Configurações do Leite, só o dono (spec 004, FR-009, FR-019; R8), e a marca
// "leiteira" nas raças próprias da fazenda (FR-004a)
export function ConfiguracaoLeite() {
  const { soConsulta } = useLeite();
  const [config, setConfig] = useState<Config | null>(null);
  const [racas, setRacas] = useState<RacaDaFazenda[]>([]);
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  // Nova raça da fazenda (ex.: um mestiço leiteiro), 2026-11-05
  const [nomeRaca, setNomeRaca] = useState('');
  const [gestacaoRaca, setGestacaoRaca] = useState('283');
  const [racaLeiteira, setRacaLeiteira] = useState(true);
  const [avisoRaca, setAvisoRaca] = useState<EstadoAviso>(null);

  useEffect(() => {
    buscarConfiguracao()
      .then(setConfig)
      .catch((e) => setAviso({ tipo: 'erro', texto: mensagemDeErro(e) }));
    apiClient.get<RacaDaFazenda[]>('/raca').then((r) => setRacas(r.data));
  }, []);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!config) return;
    try {
      setConfig(await salvarConfiguracao(config));
      setAviso({ tipo: 'sucesso', texto: 'Configurações do Leite salvas.' });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function marcarLeiteira(raca: RacaDaFazenda) {
    try {
      await apiClient.patch(`/raca/${raca.id}`, { leiteira: !raca.leiteira });
      setRacas(racas.map((r) => (r.id === raca.id ? { ...r, leiteira: !r.leiteira } : r)));
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  async function criarRaca(evento: FormEvent) {
    evento.preventDefault();
    setAvisoRaca(null);
    try {
      const nova = (
        await apiClient.post<RacaDaFazenda>('/raca', {
          nome: nomeRaca.trim(),
          gestacaoMediaDias: Number(gestacaoRaca),
          leiteira: racaLeiteira,
        })
      ).data;
      setRacas([...racas, nova].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      setAvisoRaca({
        tipo: 'sucesso',
        texto: `Raça ${nova.nome} cadastrada${nova.leiteira ? ' como leiteira' : ''}. Ela já aparece no cadastro de animal.`,
      });
      setNomeRaca('');
      setGestacaoRaca('283');
      setRacaLeiteira(true);
    } catch (e) {
      setAvisoRaca({ tipo: 'erro', texto: mensagemDeErro(e) });
    }
  }

  if (!config) return aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : <p>Carregando...</p>;
  const numero = (campo: keyof Config) => (e: { target: { value: string } }) =>
    setConfig({ ...config, [campo]: Number(e.target.value) });

  return (
    <div>
      <header>
        <h1>Configuração do Leite</h1>
      </header>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <form onSubmit={salvar}>
        <fieldset disabled={soConsulta}>
          <legend>Ordenha</legend>
          <label>
            <input
              type="radio"
              name="modo"
              checked={config.modo === 'POR_VACA'}
              onChange={() => setConfig({ ...config, modo: 'POR_VACA' })}
            />
            Por vaca (litros de cada vaca)
          </label>
          <label>
            <input
              type="radio"
              name="modo"
              checked={config.modo === 'TANQUE'}
              onChange={() => setConfig({ ...config, modo: 'TANQUE' })}
            />
            Só o tanque (as vacas em carência são anotadas uma a uma)
          </label>
          <label htmlFor="ordenhas">Ordenhas por dia</label>
          <select id="ordenhas" value={config.ordenhasPorDia} onChange={numero('ordenhasPorDia')}>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </fieldset>
        <fieldset disabled={soConsulta}>
          <legend>Secagem</legend>
          <label htmlFor="prazo">Secar quantos dias antes do parto previsto (30 a 90)</label>
          <input
            id="prazo"
            type="number"
            inputMode="numeric"
            min={30}
            max={90}
            value={config.prazoSecagemDias}
            onChange={numero('prazoSecagemDias')}
          />
          <label htmlFor="janela">Mostrar vacas a secar nos próximos (dias, 1 a 60)</label>
          <input
            id="janela"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={config.janelaSecarDias}
            onChange={numero('janelaSecarDias')}
          />
        </fieldset>
        {!soConsulta && <button type="submit">Salvar</button>}
      </form>

      <section>
        <h2>Raças leiteiras</h2>
        <p className="dica">
          O parto de uma vaca de raça leiteira abre a lactação sozinho. As raças padrão não mudam;
          cadastre aqui as raças da fazenda (ex.: um mestiço) e marque se são leiteiras.
        </p>
        {avisoRaca && (
          <Aviso tipo={avisoRaca.tipo} aoFechar={() => setAvisoRaca(null)}>
            {avisoRaca.texto}
          </Aviso>
        )}
        {!soConsulta && (
          <form onSubmit={criarRaca}>
            <h3>Nova raça</h3>
            <label htmlFor="nova-raca-nome">Nome</label>
            <input
              id="nova-raca-nome"
              maxLength={100}
              placeholder="Ex.: Girolando 3/4"
              value={nomeRaca}
              onChange={(e) => setNomeRaca(e.target.value)}
              required
            />
            <label htmlFor="nova-raca-gestacao">Gestação média (dias)</label>
            <input
              id="nova-raca-gestacao"
              type="number"
              inputMode="numeric"
              min={200}
              max={400}
              value={gestacaoRaca}
              onChange={(e) => setGestacaoRaca(e.target.value)}
              required
            />
            <label className="campo-checkbox">
              <input type="checkbox" checked={racaLeiteira} onChange={(e) => setRacaLeiteira(e.target.checked)} />
              Leiteira (o parto abre a lactação sozinho)
            </label>
            <button type="submit">Cadastrar raça</button>
          </form>
        )}
        <ul className="lista-vacas">
          {racas.map((r) => (
            <li key={r.id} className="cartao-vaca">
              <strong>{r.nome}</strong>
              {r.fazendaId === null ? (
                <span>{r.leiteira ? 'Leiteira' : 'Corte'} · padrão</span>
              ) : (
                <label>
                  <input
                    type="checkbox"
                    checked={r.leiteira}
                    disabled={soConsulta}
                    onChange={() => marcarLeiteira(r)}
                  />
                  Leiteira
                </label>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
