import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Animais } from './pages/Animais';
import { RotaProtegida } from './components/RotaProtegida';
import { NovoAnimal } from './pages/NovoAnimal';
import { NovoParto } from './pages/NovoParto';
import { NovoTratamento } from './pages/NovoTratamento';
import { Pastos } from './pages/Pastos';
import { MoverAnimal } from './pages/MoverAnimal';
import { QrCodes } from './pages/QrCodes';
import { Configuracao } from './pages/Configuracao';
import { Usuarios } from './pages/Usuarios';
import { Relatorios } from './pages/Relatorios';
import { AnimalDetalhe } from './pages/AnimalDetalhe';
import { NovoVeterinario } from './pages/NovoVeterinario';
import { NovaPesagem } from './pages/NovaPesagem';
import { Manejo } from './pages/Manejo';
import { ConsultaAnimal } from './pages/ConsultaAnimal';
import { ManejoLote } from './pages/ManejoLote';
import { Estacoes } from './pages/reproducao/Estacoes';
import { NovaEstacao } from './pages/reproducao/NovaEstacao';
import { EstacaoDetalhe } from './pages/reproducao/EstacaoDetalhe';
import { DiagnosticoLote } from './pages/reproducao/DiagnosticoLote';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Pública: aberta por quem escaneia o QR da etiqueta, sem login */}
      <Route path="/a/:codigo" element={<ConsultaAnimal />} />
      <Route element={<RotaProtegida />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/animais" element={<Animais />} />
        <Route path="/animais/novo" element={<NovoAnimal />} />
        <Route path="/partos/novo" element={<NovoParto />} />
        <Route path="/tratamentos/novo" element={<NovoTratamento />} />
        <Route path="/pastos" element={<Pastos />} />
        <Route path="/animais/mover" element={<MoverAnimal />} />
        <Route path="/qrcodes" element={<QrCodes />} />
        <Route path="/configuracao" element={<Configuracao />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/animais/:id" element={<AnimalDetalhe />} />
        <Route path="/veterinarios/novo" element={<NovoVeterinario />} />
        <Route path="/pesagens/novo" element={<NovaPesagem />} />
        <Route path="/manejo" element={<Manejo />} />
        <Route path="/manejo/lote" element={<ManejoLote />} />
        <Route path="/reproducao/estacoes" element={<Estacoes />} />
        <Route path="/reproducao/estacoes/nova" element={<NovaEstacao />} />
        <Route path="/reproducao/estacoes/:id" element={<EstacaoDetalhe />} />
        <Route path="/reproducao/diagnostico" element={<DiagnosticoLote />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;