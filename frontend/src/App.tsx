import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { useAuth } from './contexts/useAuth';

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
    </Routes>
  );
}

export default App;