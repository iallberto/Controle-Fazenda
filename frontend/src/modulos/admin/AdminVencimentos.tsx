import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData, formatarReais } from '../../utils/formatadores';
import { listarVencimentos, type Vencimento } from './api';

const ROTULO: Record<string, string> = {
  EM_DIA: 'vence',
  CARENCIA: 'em carência',
  VENCIDO: 'vencida',
};

// Próximos clientes a vencer (spec 008, FR-012c): prazo nos próximos 7 dias,
// em carência ou vencidos, para o suporte entrar em contato.
export function AdminVencimentos() {
  const [lista, setLista] = useState<Vencimento[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    document.title = 'Próximos a vencer · Painel do administrador';
    listarVencimentos()
      .then(setLista)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  return (
    <div>
      <header>
        <h1>Próximos a vencer</h1>
      </header>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!lista && !erro && <p>Carregando...</p>}
      {lista && lista.length === 0 && <p>Nenhuma fazenda vence nos próximos 7 dias.</p>}
      {lista && lista.length > 0 && (
        <ul className="lista-fazendas-admin">
          {lista.map((v) => (
            <li key={v.fazendaId}>
              <Link to={`/admin/fazendas/${v.fazendaId}`}>
                <strong>{v.nome}</strong>
              </Link>
              <span>
                {ROTULO[v.situacao] ?? v.situacao} {formatarData(v.acessoAte)} · {formatarReais(v.valorCentavos)}
              </span>
              <span className="dica">
                {v.dono ? `${v.dono.nome} · ${v.dono.email}` : 'Sem dono ativo'}
                {v.telefoneContato && ` · ${v.telefoneContato}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
