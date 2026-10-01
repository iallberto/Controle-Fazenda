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

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;