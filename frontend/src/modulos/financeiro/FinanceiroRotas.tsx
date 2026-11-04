import { NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { FinanceiroContext } from './FinanceiroContext';
import { FinanceiroInicio } from './FinanceiroInicio';
import { Lancamentos } from './Lancamentos';
import { NovoLancamento } from './NovoLancamento';
import { Categorias } from './Categorias';
import { NovaVenda } from './NovaVenda';
import { Vendas } from './Vendas';
import { VendaDetalhe } from './VendaDetalhe';

// Telas do Financeiro (spec 003) dentro de /modulos/financeiro. Só consulta:
// as telas escondem os botões de lançar; o backend recusa de qualquer forma.
// O funcionário não vê nenhuma tela com valores (FR-002).
export function FinanceiroRotas({ soConsulta }: { soConsulta: boolean }) {
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';

  return (
    <FinanceiroContext.Provider value={{ soConsulta, ehDono }}>
      {ehDono && (
        <nav className="nav-financeiro" aria-label="Financeiro">
          <NavLink to="/modulos/financeiro" end>
            Início
          </NavLink>
          <NavLink to="/modulos/financeiro/lancamentos">Lançamentos</NavLink>
          <NavLink to="/modulos/financeiro/vendas">Vendas</NavLink>
          <NavLink to="/modulos/financeiro/categorias">Categorias</NavLink>
        </nav>
      )}
      <Routes>
        <Route index element={<FinanceiroInicio />} />
        {ehDono && (
          <>
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="lancamentos/novo" element={<NovoLancamento />} />
            <Route path="lancamentos/:id/editar" element={<NovoLancamento />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="vendas/nova" element={<NovaVenda />} />
            <Route path="vendas/:id" element={<VendaDetalhe />} />
          </>
        )}
        <Route path="*" element={<FinanceiroInicio />} />
      </Routes>
    </FinanceiroContext.Provider>
  );
}
