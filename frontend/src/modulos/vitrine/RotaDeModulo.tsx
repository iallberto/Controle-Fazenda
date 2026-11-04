import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { moduloDaRota, type ModuloPago } from '../../api/modulos';
import { useModulos } from '../../contexts/useModulos';
import { ROTULOS_MODULO } from '../../utils/formatadores';
import { FinanceiroRotas } from '../financeiro/FinanceiroRotas';
import { LeiteRotas } from '../leite/LeiteRotas';
import { NutricaoRotas } from '../nutricao/NutricaoRotas';

// O que cada módulo faz, para a vitrine (docs/modulos/Planejamento-modulos.md)
const DESCRICOES: Record<ModuloPago, string[]> = {
  LEITE: [
    'Lactação e ordenha por vaca, com a produção do dia',
    'Carência de medicamentos: o leite que não pode ser entregue',
    'Qualidade e entregas ao laticínio',
  ],
  FINANCEIRO: [
    'Receitas e despesas da fazenda',
    'Venda de animais com o valor recebido',
    'Gráficos e relatórios do mês e do ano',
  ],
  NUTRICAO: [
    'Estoque de insumos e de silagem',
    'Dietas por lote e o fornecimento do dia',
    'Custo da alimentação',
  ],
};

// /modulos/:modulo — vitrine para quem não contratou, tela do módulo para quem
// tem, e só consulta para quem já teve (spec 002, FR-014, FR-015, FR-011a).
// Abrir pelo endereço um módulo não contratado mostra a vitrine, nunca erro.
export function RotaDeModulo() {
  const { modulo: trecho } = useParams<{ modulo: string }>();
  const modulo = moduloDaRota(trecho);
  const { situacaoDe, recarregar, modulos } = useModulos();

  // A situação pode ter mudado desde o login (o administrador liberou ou desativou)
  useEffect(() => {
    recarregar();
  }, [recarregar, modulo]);

  if (!modulo) return <Navigate to="/" replace />;
  if (!modulos) return <p>Carregando...</p>;

  const situacao = situacaoDe(modulo);
  if (!situacao || situacao.situacao === 'NAO_CONTRATADO') {
    return <Vitrine modulo={modulo} />;
  }
  // Cada módulo abre as próprias telas (Financeiro, Leite e Nutrição)
  if (modulo === 'FINANCEIRO') {
    return <FinanceiroRotas soConsulta={situacao.situacao === 'SO_CONSULTA'} />;
  }
  if (modulo === 'LEITE') {
    return <LeiteRotas soConsulta={situacao.situacao === 'SO_CONSULTA'} />;
  }
  return <NutricaoRotas soConsulta={situacao.situacao === 'SO_CONSULTA'} />;
}

function Vitrine({ modulo }: { modulo: ModuloPago }) {
  const nome = ROTULOS_MODULO[modulo];
  return (
    <div>
      <header>
        <h1>Módulo {nome}</h1>
      </header>
      <section className="vitrine">
        <p className="vitrine-chamada">Disponível no módulo {nome} · fale com o suporte</p>
        <ul>
          {DESCRICOES[modulo].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="dica">
          O pacote inicial (rebanho, reprodução, manejo e relatórios) continua igual. O módulo {nome} é
          contratado à parte e liberado para a sua fazenda pelo suporte.
        </p>
      </section>
    </div>
  );
}
