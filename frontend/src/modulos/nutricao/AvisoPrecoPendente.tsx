import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { useModulos } from '../../contexts/useModulos';
import { Aviso } from '../../components/Aviso';
import { buscarPendencias } from './api';

// Aviso ao dono das entradas aguardando preço (spec 005, FR-021), no início da
// Nutrição e no painel inicial, com a Nutrição ativa
export function AvisoPrecoPendente() {
  const { usuario } = useAuth();
  const { situacaoDe } = useModulos();
  const ativa = situacaoDe('NUTRICAO')?.situacao === 'ATIVO';
  const ehDono = usuario?.papel === 'DONO';
  const [quantidade, setQuantidade] = useState(0);

  useEffect(() => {
    if (!ativa || !ehDono) return;
    buscarPendencias()
      .then((p) => setQuantidade(p.entradasAguardandoPreco))
      .catch(() => setQuantidade(0));
  }, [ativa, ehDono]);

  if (!ativa || !ehDono || quantidade === 0) return null;
  return (
    <Aviso tipo="atencao">
      {quantidade === 1 ? '1 entrada de insumo aguardando preço' : `${quantidade} entradas de insumo aguardando preço`} ·{' '}
      <Link to="/modulos/nutricao/aguardando-preco">informe o valor</Link> para o custo da alimentação ficar certo.
    </Aviso>
  );
}
