import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { listarInsumos, textoDoEstoque, type InsumoEstoque } from './api';
import { useNutricao } from './NutricaoContext';
import { AvisoPrecoPendente } from './AvisoPrecoPendente';

// Início da Nutrição: atalhos do dia e os insumos em alerta (spec 005)
export function NutricaoInicio() {
  const { soConsulta } = useNutricao();
  const [insumos, setInsumos] = useState<InsumoEstoque[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarInsumos()
      .then(setInsumos)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  const alertas = insumos?.filter((i) => i.situacao !== 'NORMAL') ?? [];

  return (
    <div>
      <header>
        <h1>Nutrição</h1>
      </header>
      {soConsulta && (
        <Aviso tipo="atencao">Módulo desativado: só consulta · fale com o suporte para reativar</Aviso>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <AvisoPrecoPendente />

      {!soConsulta && (
        <section className="atalhos-modulo">
          <Link className="botao botao-grande" to="/modulos/nutricao/fornecimento">
            Lançar trato
          </Link>
          <Link className="botao" to="/modulos/nutricao/movimento?tipo=ENTRADA">
            Lançar entrada
          </Link>
          <Link className="botao" to="/modulos/nutricao/movimento?tipo=BAIXA">
            Dar baixa
          </Link>
        </section>
      )}

      {alertas.length > 0 && (
        <section className="faixa-descarte" aria-label="Estoque em alerta">
          <h2>Estoque em alerta</h2>
          <ul>
            {alertas.map((i) => (
              <li key={i.id}>
                {i.nome}: {textoDoEstoque(i)}
                {i.situacao === 'NEGATIVO' ? ' · negativo, falta lançar entrada' : ' · abaixo do mínimo'}
              </li>
            ))}
          </ul>
        </section>
      )}

      {insumos && insumos.length === 0 && (
        <p className="dica">
          Comece cadastrando os insumos em <Link to="/modulos/nutricao/estoque">Estoque</Link> (o dono),
          depois os lotes de alimentação e as dietas.
        </p>
      )}
    </div>
  );
}
