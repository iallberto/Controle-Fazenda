import { NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { LeiteContext } from './LeiteContext';
import { LeiteInicio } from './LeiteInicio';
import { Ordenha } from './Ordenha';
import { OrdenhaDia } from './OrdenhaDia';
import { Vacas } from './Vacas';
import { VacaLeite } from './VacaLeite';
import { Produtos } from './Produtos';
import { ConfiguracaoLeite } from './ConfiguracaoLeite';
import { ASecar } from './ASecar';
import { Entregas } from './Entregas';
import { Analises } from './Analises';
import { Producao } from './Producao';

// Telas do Leite (spec 004) dentro de /modulos/leite. Só consulta: as telas
// escondem os botões de lançar; o backend recusa de qualquer forma.
export function LeiteRotas({ soConsulta }: { soConsulta: boolean }) {
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';

  return (
    <LeiteContext.Provider value={{ soConsulta, ehDono }}>
      <nav className="nav-modulo" aria-label="Leite">
        <NavLink to="/modulos/leite" end>
          Início
        </NavLink>
        <NavLink to="/modulos/leite/ordenha">Ordenha</NavLink>
        <NavLink to="/modulos/leite/vacas">Vacas</NavLink>
        <NavLink to="/modulos/leite/a-secar">A secar</NavLink>
        <NavLink to="/modulos/leite/entregas">Entregas</NavLink>
        <NavLink to="/modulos/leite/producao">Produção</NavLink>
        <NavLink to="/modulos/leite/produtos">Produtos</NavLink>
        {ehDono && <NavLink to="/modulos/leite/configuracao">Configuração</NavLink>}
      </nav>
      <Routes>
        <Route index element={<LeiteInicio />} />
        <Route path="ordenha" element={<Ordenha />} />
        <Route path="ordenha/dia" element={<OrdenhaDia />} />
        <Route path="vacas" element={<Vacas />} />
        <Route path="vacas/:animalId" element={<VacaLeite />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="a-secar" element={<ASecar />} />
        <Route path="entregas" element={<Entregas />} />
        <Route path="analises" element={<Analises />} />
        <Route path="producao" element={<Producao />} />
        {ehDono && <Route path="configuracao" element={<ConfiguracaoLeite />} />}
        <Route path="*" element={<LeiteInicio />} />
      </Routes>
    </LeiteContext.Provider>
  );
}
