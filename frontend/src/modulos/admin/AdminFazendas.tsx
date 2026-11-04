import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarMomento } from '../../utils/formatadores';
import { listarFazendasClientes, type FazendaCliente } from './api';
import { SeloModulo } from './SeloModulo';

// Fazendas clientes com usuários ativos, situação e módulos (FR-019).
// Nenhum dado de rebanho aparece aqui (FR-021).
export function AdminFazendas() {
  const [fazendas, setFazendas] = useState<FazendaCliente[] | null>(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');

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

  function handleBuscar(evento: FormEvent) {
    evento.preventDefault();
    carregar(busca);
  }

  return (
    <div>
      <header>
        <h1>Fazendas clientes</h1>
      </header>

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
