import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarReais } from '../../utils/formatadores';
import { listarLancamentos, type MesFinanceiro } from './api';
import { useFinanceiro } from './FinanceiroContext';
import { mesAtual, nomeDoMes } from '../../utils/meses';

// Início do Financeiro: para o dono, o mês corrente e os atalhos do dia a dia;
// para o funcionário, só o que ele pode fazer, sem nenhum valor (FR-002).
export function FinanceiroInicio() {
  const { ehDono, soConsulta } = useFinanceiro();
  const [mes, setMes] = useState<MesFinanceiro | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!ehDono) return;
    listarLancamentos({ mes: mesAtual() })
      .then(setMes)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [ehDono]);

  if (!ehDono) {
    return (
      <div>
        <header>
          <h1>Financeiro</h1>
        </header>
        <p>Os valores do Financeiro ficam com o dono da fazenda. Aqui você anota o que foi usado ou trazido.</p>
        {!soConsulta && (
          <section className="atalhos-financeiro">
            <Link className="botao" to="/modulos/financeiro/usos/novo">
              Registrar uso
            </Link>
          </section>
        )}
        <Link to="/modulos/financeiro/usos">Ver os registros da fazenda</Link>
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1>Financeiro</h1>
      </header>

      {soConsulta && (
        <Aviso tipo="atencao">Módulo desativado: só consulta · fale com o suporte para reativar</Aviso>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {mes && (
        <section>
          <h2>{nomeDoMes(mesAtual())}</h2>
          <dl className="resumo-mes">
            <dt>Receitas</dt>
            <dd className="valor-receita">{formatarReais(mes.receitaCentavos)}</dd>
            <dt>Despesas</dt>
            <dd className="valor-despesa">{formatarReais(mes.despesaCentavos)}</dd>
            <dt>Saldo</dt>
            <dd className={mes.saldoCentavos < 0 ? 'valor-despesa' : 'valor-receita'}>
              {formatarReais(mes.saldoCentavos)}
            </dd>
          </dl>
          <Link to="/modulos/financeiro/lancamentos">Ver os lançamentos do mês</Link>
        </section>
      )}

      {!soConsulta && (
        <section className="atalhos-financeiro">
          <Link className="botao" to="/modulos/financeiro/lancamentos/novo?tipo=DESPESA">
            Lançar despesa
          </Link>
          <Link className="botao" to="/modulos/financeiro/lancamentos/novo?tipo=RECEITA">
            Lançar receita
          </Link>
          <Link className="botao" to="/modulos/financeiro/vendas/nova">
            Vender animais
          </Link>
        </section>
      )}
    </div>
  );
}
