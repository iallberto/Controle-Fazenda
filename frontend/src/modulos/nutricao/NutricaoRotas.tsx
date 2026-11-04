import { NavLink, Route, Routes } from 'react-router-dom';
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

// Telas da Nutrição (spec 005) dentro de /modulos/nutricao. Só consulta: as
// telas escondem os botões de lançar; o backend recusa de qualquer forma.
export function NutricaoRotas({ soConsulta }: { soConsulta: boolean }) {
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';

  return (
    <NutricaoContext.Provider value={{ soConsulta, ehDono }}>
      <nav className="nav-modulo" aria-label="Nutrição">
        <NavLink to="/modulos/nutricao" end>
          Início
        </NavLink>
        <NavLink to="/modulos/nutricao/fornecimento">Trato</NavLink>
        <NavLink to="/modulos/nutricao/estoque">Estoque</NavLink>
        <NavLink to="/modulos/nutricao/lotes">Lotes</NavLink>
        <NavLink to="/modulos/nutricao/dietas">Dietas</NavLink>
      </nav>
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
        <Route path="*" element={<NutricaoInicio />} />
      </Routes>
    </NutricaoContext.Provider>
  );
}
