import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { SenhaProvisoria } from '../../components/SenhaProvisoria';
import { formatarMomento } from '../../utils/formatadores';
import { criarFazendaCliente, listarFazendasClientes, type FazendaCliente } from './api';
import { SeloModulo } from './SeloModulo';

// Fazendas clientes com usuários ativos, situação e módulos (FR-019).
// Nenhum dado de rebanho aparece aqui (FR-021).
export function AdminFazendas() {
  const [fazendas, setFazendas] = useState<FazendaCliente[] | null>(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const avisoNavegacao = (useLocation().state as { aviso?: string } | null)?.aviso;
  // Fazenda nova (spec 007, FR-023)
  const [criando, setCriando] = useState(false);
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [nomeDono, setNomeDono] = useState('');
  const [emailDono, setEmailDono] = useState('');
  const [erroNova, setErroNova] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [provisoria, setProvisoria] = useState<{ para: string; senha: string; fazendaId: string } | null>(null);

  function carregar(termo?: string) {
    listarFazendasClientes(termo)
      .then((lista) => {
        setFazendas(lista);
        setErro('');
      })
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }

  useEffect(() => {
    document.title = 'Fazendas clientes · Painel do administrador';
    carregar();
  }, []);

  async function handleCriar(evento: FormEvent) {
    evento.preventDefault();
    setErroNova('');
    setEnviando(true);
    try {
      const r = await criarFazendaCliente({ nomeFazenda, nomeDono, emailDono });
      setProvisoria({ para: `${nomeDono} (${emailDono}), dono da ${nomeFazenda}`, senha: r.senhaProvisoria, fazendaId: r.fazendaId });
      setCriando(false);
      setNomeFazenda('');
      setNomeDono('');
      setEmailDono('');
      carregar();
    } catch (erroRequisicao) {
      setErroNova(mensagemDeErro(erroRequisicao, 'Não foi possível criar a fazenda.'));
    } finally {
      setEnviando(false);
    }
  }

  function handleBuscar(evento: FormEvent) {
    evento.preventDefault();
    carregar(busca);
  }

  return (
    <div>
      <header>
        <h1>Fazendas clientes</h1>
        {!criando && (
          <button type="button" onClick={() => setCriando(true)}>
            Nova fazenda
          </button>
        )}
      </header>

      {avisoNavegacao && <Aviso tipo="sucesso">{avisoNavegacao}</Aviso>}

      {provisoria && (
        <>
          <SenhaProvisoria para={provisoria.para} senha={provisoria.senha} aoFechar={() => setProvisoria(null)} />
          <p>
            <Link to={`/admin/fazendas/${provisoria.fazendaId}`}>Abrir a fazenda para liberar módulos</Link>
          </p>
        </>
      )}

      {criando && (
        <section>
          <h2>Nova fazenda</h2>
          <form onSubmit={handleCriar}>
            <div>
              <label htmlFor="nova-fazenda-nome">Nome da fazenda</label>
              <input id="nova-fazenda-nome" maxLength={150} value={nomeFazenda} onChange={(e) => setNomeFazenda(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="nova-fazenda-dono">Nome do dono</label>
              <input id="nova-fazenda-dono" maxLength={150} value={nomeDono} onChange={(e) => setNomeDono(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="nova-fazenda-email">E-mail do dono (usado no login)</label>
              <input
                id="nova-fazenda-email"
                type="email"
                autoComplete="off"
                value={emailDono}
                onChange={(e) => setEmailDono(e.target.value)}
                required
              />
            </div>
            <p className="dica">A fazenda nasce com o pacote inicial. O dono recebe uma senha provisória e cria a dele no primeiro login.</p>
            {erroNova && <Aviso tipo="erro">{erroNova}</Aviso>}
            <button type="submit" disabled={enviando}>
              {enviando ? 'Criando…' : 'Criar fazenda'}
            </button>{' '}
            <button type="button" className="botao-secundario" onClick={() => setCriando(false)}>
              Cancelar
            </button>
          </form>
        </section>
      )}

      <form onSubmit={handleBuscar} className="filtro-linha">
        <label htmlFor="busca-fazenda">Buscar pelo nome</label>
        <input
          id="busca-fazenda"
          value={busca}
          maxLength={100}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!fazendas && !erro && <p>Carregando...</p>}
      {fazendas && fazendas.length === 0 && <p>Nenhuma fazenda encontrada.</p>}

      {fazendas && fazendas.length > 0 && (
        <ul className="lista-fazendas-admin">
          {fazendas.map((fazenda) => (
            <li key={fazenda.id}>
              <div className="indicador-cabecalho">
                <Link to={`/admin/fazendas/${fazenda.id}`}>
                  <strong>{fazenda.nome}</strong>
                </Link>
                {fazenda.suspensa && <span className="selo selo-suspensa">Suspensa</span>}
              </div>
              <small>
                Cliente desde {formatarMomento(fazenda.criadaEm)} ·{' '}
                {fazenda.usuariosAtivos === 1
                  ? '1 usuário ativo'
                  : `${fazenda.usuariosAtivos} usuários ativos`}
              </small>
              <div className="selos">
                {fazenda.modulos.map((modulo) => (
                  <SeloModulo key={modulo.modulo} modulo={modulo} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
