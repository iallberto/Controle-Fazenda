import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Animais } from './pages/Animais';
import { RotaProtegida } from './components/RotaProtegida';
import { NovoAnimal } from './pages/NovoAnimal';
import { NovoParto } from './pages/NovoParto';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RotaProtegida />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/animais" element={<Animais />} />
        <Route path="/animais/novo" element={<NovoAnimal />} />
        <Route path="/partos/novo" element={<NovoParto />} />
        
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;