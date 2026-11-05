import { Route, Routes } from 'react-router-dom';
import { MenuDoModulo } from '../../components/MenuDoModulo';
import { useAuth } from '../../contexts/useAuth';
import { FinanceiroContext } from './FinanceiroContext';
import { FinanceiroInicio } from './FinanceiroInicio';
import { Lancamentos } from './Lancamentos';
import { NovoLancamento } from './NovoLancamento';
import { Categorias } from './Categorias';
import { NovaVenda } from './NovaVenda';
import { Vendas } from './Vendas';
import { VendaDetalhe } from './VendaDetalhe';
import { RegistrarUso } from './RegistrarUso';
import { Usos } from './Usos';
import { Pendencias } from './Pendencias';
import { Resultado } from './Resultado';

// Telas do Financeiro (spec 003) dentro de /modulos/financeiro. Só consulta:
// as telas escondem os botões de lançar; o backend recusa de qualquer forma.
// O funcionário não vê nenhuma tela com valores (FR-002): só os registros de uso.
export function FinanceiroRotas({ soConsulta }: { soConsulta: boolean }) {
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';

  return (
    <FinanceiroContext.Provider value={{ soConsulta, ehDono }}>
      {ehDono && (
        <MenuDoModulo
          modulo="Financeiro"
          itens={[
            { rotulo: 'Início', destino: '/modulos/financeiro', exato: true },
            { rotulo: 'Lançamentos', destino: '/modulos/financeiro/lancamentos' },
            { rotulo: 'Vendas', destino: '/modulos/financeiro/vendas' },
            { rotulo: 'Resultado', destino: '/modulos/financeiro/resultado' },
            { rotulo: 'Pendências', destino: '/modulos/financeiro/pendencias' },
            { rotulo: 'Usos', destino: '/modulos/financeiro/usos' },
            { rotulo: 'Categorias', destino: '/modulos/financeiro/categorias' },
          ]}
        />
      )}
      <Routes>
        <Route index element={<FinanceiroInicio />} />
        {/* Usos: dono e funcionário, sem valores (US4) */}
        <Route path="usos" element={<Usos />} />
        <Route path="usos/novo" element={<RegistrarUso />} />
        {ehDono && (
          <>
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="lancamentos/novo" element={<NovoLancamento />} />
            <Route path="lancamentos/:id/editar" element={<NovoLancamento />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="vendas/nova" element={<NovaVenda />} />
            <Route path="vendas/:id" element={<VendaDetalhe />} />
            <Route path="pendencias" element={<Pendencias />} />
            <Route path="resultado" element={<Resultado />} />
          </>
        )}
        <Route path="*" element={<FinanceiroInicio />} />
      </Routes>
    </FinanceiroContext.Provider>
  );
}
