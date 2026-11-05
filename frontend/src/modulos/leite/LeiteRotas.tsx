import { Route, Routes } from 'react-router-dom';
import { MenuDoModulo } from '../../components/MenuDoModulo';
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
      <MenuDoModulo
        modulo="Leite"
        itens={[
          { rotulo: 'Início', destino: '/modulos/leite', exato: true },
          { rotulo: 'Ordenha', destino: '/modulos/leite/ordenha' },
          { rotulo: 'Vacas', destino: '/modulos/leite/vacas' },
          { rotulo: 'A secar', destino: '/modulos/leite/a-secar' },
          { rotulo: 'Entregas', destino: '/modulos/leite/entregas' },
          { rotulo: 'Produção', destino: '/modulos/leite/producao' },
          { rotulo: 'Produtos', destino: '/modulos/leite/produtos' },
          ...(ehDono ? [{ rotulo: 'Configuração', destino: '/modulos/leite/configuracao' }] : []),
        ]}
      />
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
