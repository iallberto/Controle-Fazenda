import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import {
  consultarExemplo,
  lancarExemplo,
  moduloDaRota,
  type ModuloDaFazenda,
  type ModuloPago,
} from '../../api/modulos';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { useAuth } from '../../contexts/useAuth';
import { useModulos } from '../../contexts/useModulos';
import { formatarData, ROTULOS_MODULO } from '../../utils/formatadores';
import { FinanceiroRotas } from '../financeiro/FinanceiroRotas';
import { LeiteRotas } from '../leite/LeiteRotas';

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
  // Módulos já construídos abrem as próprias telas; os outros, a página de espera
  if (modulo === 'FINANCEIRO') {
    return <FinanceiroRotas soConsulta={situacao.situacao === 'SO_CONSULTA'} />;
  }
  if (modulo === 'LEITE') {
    return <LeiteRotas soConsulta={situacao.situacao === 'SO_CONSULTA'} />;
  }
  return <TelaDeEspera situacao={situacao} />;
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

// Os módulos ainda não têm telas próprias (fase 0). Esta página mostra a
// situação e testa a ligação com o módulo pelas rotas de exemplo.
function TelaDeEspera({ situacao }: { situacao: ModuloDaFazenda }) {
  const { usuario } = useAuth();
  const nome = ROTULOS_MODULO[situacao.modulo];
  const soConsulta = situacao.situacao === 'SO_CONSULTA';
  const [aviso, setAviso] = useState<EstadoAviso>(null);

  async function testar(acao: 'consulta' | 'lancamento') {
    setAviso(null);
    try {
      if (acao === 'consulta') await consultarExemplo(situacao.modulo);
      else await lancarExemplo(situacao.modulo);
      setAviso({
        tipo: 'sucesso',
        texto: acao === 'consulta' ? 'Consulta liberada.' : 'Lançamento liberado.',
      });
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro) });
    }
  }

  return (
    <div>
      <header>
        <h1>Módulo {nome}</h1>
      </header>

      {soConsulta ? (
        <Aviso tipo="atencao">Módulo desativado: só consulta · fale com o suporte para reativar</Aviso>
      ) : (
        <p>
          Módulo contratado
          {situacao.dataTermino && usuario?.papel === 'DONO'
            ? `, até ${formatarData(situacao.dataTermino)}`
            : ''}
          . As telas do {nome} chegam na próxima versão do sistema.
        </p>
      )}

      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}

      <section>
        <h2>Ligação com o módulo</h2>
        <div className="acoes-marcacao">
          <button type="button" onClick={() => testar('consulta')}>
            Testar consulta
          </button>
          {!soConsulta && (
            <button type="submit" onClick={() => testar('lancamento')}>
              Testar lançamento
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
