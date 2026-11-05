import { Route, Routes } from 'react-router-dom';
import { MenuDoModulo } from '../../components/MenuDoModulo';
import { useAuth } from '../../contexts/useAuth';
import { NutricaoContext } from './NutricaoContext';
import { NutricaoInicio } from './NutricaoInicio';
import { Estoque } from './Estoque';
import { NovoInsumo } from './NovoInsumo';
import { InsumoDetalhe } from './InsumoDetalhe';
import { Movimento } from './Movimento';
import { Lotes } from './Lotes';
import { LoteDetalhe } from './LoteDetalhe';
import { Dietas } from './Dietas';
import { Fornecimento } from './Fornecimento';
import { Silos } from './Silos';
import { Custo } from './Custo';
import { AguardandoPreco } from './AguardandoPreco';

// Telas da Nutrição (spec 005) dentro de /modulos/nutricao. Só consulta: as
// telas escondem os botões de lançar; o backend recusa de qualquer forma.
export function NutricaoRotas({ soConsulta }: { soConsulta: boolean }) {
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';

  return (
    <NutricaoContext.Provider value={{ soConsulta, ehDono }}>
      <MenuDoModulo
        modulo="Nutrição"
        itens={[
          { rotulo: 'Início', destino: '/modulos/nutricao', exato: true },
          { rotulo: 'Trato', destino: '/modulos/nutricao/fornecimento' },
          { rotulo: 'Estoque', destino: '/modulos/nutricao/estoque' },
          { rotulo: 'Lotes', destino: '/modulos/nutricao/lotes' },
          { rotulo: 'Dietas', destino: '/modulos/nutricao/dietas' },
          { rotulo: 'Silos', destino: '/modulos/nutricao/silos' },
          ...(ehDono ? [{ rotulo: 'Custo', destino: '/modulos/nutricao/custo' }] : []),
        ]}
      />
      <Routes>
        <Route index element={<NutricaoInicio />} />
        <Route path="fornecimento" element={<Fornecimento />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="insumos/novo" element={<NovoInsumo />} />
        <Route path="insumos/:id" element={<InsumoDetalhe />} />
        <Route path="movimento" element={<Movimento />} />
        <Route path="lotes" element={<Lotes />} />
        <Route path="lotes/:id" element={<LoteDetalhe />} />
        <Route path="dietas" element={<Dietas />} />
        <Route path="silos" element={<Silos />} />
        {ehDono && <Route path="custo" element={<Custo />} />}
        {ehDono && <Route path="aguardando-preco" element={<AguardandoPreco />} />}
        <Route path="*" element={<NutricaoInicio />} />
      </Routes>
    </NutricaoContext.Provider>
  );
}
