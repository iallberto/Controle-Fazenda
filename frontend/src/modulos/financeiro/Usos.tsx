import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData, rotuloBrinco } from '../../utils/formatadores';
import { listarUsos, type RegistroUso, type SituacaoUso } from './api';
import { useFinanceiro } from './FinanceiroContext';
import { formatarQuantidade } from '../../utils/meses';

const SITUACOES: Record<SituacaoUso, string> = {
  AGUARDANDO: 'aguardando valor',
  LANCADO: 'lançado',
  DESCARTADO: 'descartado',
};

// Registros de uso da fazenda, de todos, com quem registrou e a situação,
// sem nenhum valor (spec 003, FR-023)
export function Usos() {
  const { soConsulta, ehDono } = useFinanceiro();
  const [usos, setUsos] = useState<RegistroUso[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarUsos()
      .then(setUsos)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  return (
    <div>
      <header>
        <h1>Registros de uso</h1>
        {!soConsulta && <Link to="/modulos/financeiro/usos/novo">Registrar uso</Link>}
      </header>

      {ehDono && (
        <p>
          Os registros aguardando valor ficam em <Link to="/modulos/financeiro/pendencias">Pendências</Link>.
        </p>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!usos && !erro && <p>Carregando...</p>}
      {usos && usos.length === 0 && <p>Nenhum registro ainda.</p>}

      {usos && usos.length > 0 && (
        <ul className="lista-lancamentos">
          {usos.map((uso) => (
            <li key={uso.id} className={uso.situacao === 'DESCARTADO' ? 'cancelado' : undefined}>
              <span>
                <strong>
                  {uso.item} — {formatarQuantidade(uso.quantidade)} {uso.unidade}
                </strong>
                <br />
                <small>
                  {formatarData(uso.data)} · {uso.categoria}
                  {uso.animal && ` · ${rotuloBrinco(uso.animal.brinco)}`}
                  {uso.pasto && ` · ${uso.pasto.nome}`}
                  {uso.registradoPor && ` · por ${uso.registradoPor}`} · {SITUACOES[uso.situacao]}
                </small>
              </span>
              {uso.motivoDescarte && <small className="motivo-cancelado">Descartado: {uso.motivoDescarte}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
