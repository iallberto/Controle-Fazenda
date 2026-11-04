import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarReais } from '../../utils/formatadores';
import {
  formatarQuantidade,
  listarInsumos,
  ROTULOS_BASE,
  ROTULOS_TIPO,
  textoDoEstoque,
  type InsumoEstoque,
} from './api';
import { useNutricao } from './NutricaoContext';

// Estoque de todos os insumos, com alerta e reserva em silo (spec 005, FR-007)
export function Estoque() {
  const { soConsulta, ehDono } = useNutricao();
  const [insumos, setInsumos] = useState<InsumoEstoque[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarInsumos(true)
      .then(setInsumos)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  return (
    <div>
      <header>
        <h1>Estoque</h1>
        {ehDono && !soConsulta && <Link to="/modulos/nutricao/insumos/novo">Novo insumo</Link>}
      </header>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {!soConsulta && (
        <section className="atalhos-modulo">
          <Link className="botao" to="/modulos/nutricao/movimento?tipo=ENTRADA">
            Lançar entrada
          </Link>
          <Link className="botao" to="/modulos/nutricao/movimento?tipo=BAIXA">
            Dar baixa
          </Link>
        </section>
      )}
      {insumos && insumos.length === 0 && <p>Nenhum insumo cadastrado.</p>}
      <ul className="lista-vacas">
        {insumos?.map((i) => (
          <li key={i.id}>
            <Link
              to={`/modulos/nutricao/insumos/${i.id}`}
              className={`cartao-vaca${i.ativo ? '' : ' cartao-inativo'}`}
            >
              <strong>{i.nome}</strong>
              <span>
                {ROTULOS_TIPO[i.tipo]}
                {!i.ativo && ' · desativado'}
              </span>
              <span className={i.situacao === 'NORMAL' ? undefined : 'texto-descarte'}>
                {textoDoEstoque(i)}
                {i.situacao === 'NEGATIVO' && ' · negativo'}
                {i.situacao === 'BAIXO' && ' · abaixo do mínimo'}
              </span>
              {i.reservaSilosFechadosBase > 0 && (
                <span>
                  Reserva em silos fechados:{' '}
                  {formatarQuantidade(i.reservaSilosFechadosBase / 1000, 't')}
                </span>
              )}
              {ehDono && i.custoMedioCentavosPorBase != null && (
                <span>
                  Custo médio: {formatarReais(Math.round(i.custoMedioCentavosPorBase * 100) / 100)}/
                  {ROTULOS_BASE[i.unidadeBase]}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
