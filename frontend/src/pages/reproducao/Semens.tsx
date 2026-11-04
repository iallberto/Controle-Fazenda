import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listarRacas, type Raca } from '../../api/racas';
import { cadastrarSemen, entradaDoses, excluirSemen, listarSemens, type Semen } from '../../api/reproducao';
import { mensagemDeErro } from '../../api/client';
import { useAuth } from '../../contexts/useAuth';
import { Aviso, type EstadoAviso } from '../../components/Aviso';

function rotuloDoses(doses: number) {
  return doses === 1 ? '1 dose' : `${doses} doses`;
}

// US5: sêmen comprado para inseminação, com as doses em estoque (FR-009, FR-012).
// Só o dono exclui, e só sêmen que nunca foi usado (FR-024).
export function Semens() {
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';
  const [semens, setSemens] = useState<Semen[] | null>(null);
  const [racas, setRacas] = useState<Raca[]>([]);
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  const [nomeTouro, setNomeTouro] = useState('');
  const [racaId, setRacaId] = useState('');
  const [central, setCentral] = useState('');
  const [doses, setDoses] = useState('');
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    listarSemens()
      .then(setSemens)
      .catch((erro) => setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) }));
  }

  useEffect(() => {
    carregar();
    listarRacas().then(setRacas).catch(() => {});
  }, []);

  async function handleCadastrar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    setEnviando(true);
    try {
      const semen = await cadastrarSemen({
        nomeTouro,
        racaId: racaId || undefined,
        central: central || undefined,
        doses: Number(doses) || 0,
      });
      setAviso({ tipo: 'sucesso', texto: `Sêmen ${semen.nomeTouro} cadastrado com ${rotuloDoses(semen.doses)}.` });
      setNomeTouro('');
      setRacaId('');
      setCentral('');
      setDoses('');
      carregar();
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível cadastrar o sêmen.') });
    } finally {
      setEnviando(false);
    }
  }

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setAviso(null);
    try {
      await acao();
      setAviso({ tipo: 'sucesso', texto: sucesso });
      carregar();
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) });
    }
  }

  return (
    <div>
      <header>
        <h1>Sêmen</h1>
        <Link to="/reproducao/inseminacao">Registrar inseminação</Link>
      </header>

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <section>
        <h2>Em estoque</h2>
        {!semens && <p>Carregando...</p>}
        {semens && semens.length === 0 && (
          <p>Nenhum sêmen cadastrado. Só é preciso cadastrar se a fazenda faz inseminação (IA ou IATF).</p>
        )}
        {semens && semens.length > 0 && (
          <ul className="lista-semens">
            {semens.map((semen) => (
              <ItemSemen
                key={semen.id}
                semen={semen}
                ehDono={ehDono}
                aoEntrada={(quantidade) =>
                  executar(
                    () => entradaDoses(semen.id, quantidade),
                    `Entrada de ${rotuloDoses(quantidade)} em ${semen.nomeTouro}.`,
                  )
                }
                aoExcluir={() => executar(() => excluirSemen(semen.id), `Sêmen ${semen.nomeTouro} excluído.`)}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Cadastrar sêmen</h2>
        <form onSubmit={handleCadastrar}>
          <div>
            <label htmlFor="nome-touro">Nome do touro</label>
            <input
              id="nome-touro"
              maxLength={100}
              value={nomeTouro}
              onChange={(e) => setNomeTouro(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="raca">Raça (opcional)</label>
            <select id="raca" value={racaId} onChange={(e) => setRacaId(e.target.value)}>
              <option value="">Não informada</option>
              {racas.map((raca) => (
                <option key={raca.id} value={raca.id}>
                  {raca.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="central">Central (opcional)</label>
            <input id="central" maxLength={100} value={central} onChange={(e) => setCentral(e.target.value)} />
          </div>
          <div>
            <label htmlFor="doses">Doses</label>
            <input
              id="doses"
              type="number"
              min={0}
              max={10000}
              inputMode="numeric"
              value={doses}
              onChange={(e) => setDoses(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={enviando}>
            {enviando ? 'Salvando...' : 'Cadastrar sêmen'}
          </button>
        </form>
      </section>
    </div>
  );
}

function ItemSemen({
  semen,
  ehDono,
  aoEntrada,
  aoExcluir,
}: {
  semen: Semen;
  ehDono: boolean;
  aoEntrada: (doses: number) => void;
  aoExcluir: () => void;
}) {
  const [quantidade, setQuantidade] = useState('');
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const detalhes = [semen.raca?.nome, semen.central].filter(Boolean).join(' · ');

  return (
    <li>
      <div className="semen-cabecalho">
        <span>
          <strong>{semen.nomeTouro}</strong>
          {detalhes && <small> · {detalhes}</small>}
        </span>
        <span className={semen.doses === 0 ? 'doses sem-estoque' : 'doses'}>
          {semen.doses === 0 ? 'Sem doses' : rotuloDoses(semen.doses)}
        </span>
      </div>
      <form
        className="entrada-doses"
        onSubmit={(evento) => {
          evento.preventDefault();
          const valor = Number(quantidade);
          if (valor > 0) {
            aoEntrada(valor);
            setQuantidade('');
          }
        }}
      >
        <input
          aria-label={`Doses compradas de ${semen.nomeTouro}`}
          type="number"
          min={1}
          max={10000}
          inputMode="numeric"
          placeholder="doses"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
        <button type="submit" disabled={!(Number(quantidade) > 0)}>
          Dar entrada
        </button>
        {ehDono &&
          (confirmarExclusao ? (
            <>
              <button type="button" onClick={aoExcluir}>
                Confirmar exclusão
              </button>
              <button type="button" className="botao-link" onClick={() => setConfirmarExclusao(false)}>
                Voltar
              </button>
            </>
          ) : (
            <button type="button" className="botao-link" onClick={() => setConfirmarExclusao(true)}>
              Excluir
            </button>
          ))}
      </form>
    </li>
  );
}
