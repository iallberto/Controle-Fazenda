import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { useAuth } from './contexts/useAuth';

function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={token ? <div>Área logada (em construção)</div> : <Navigate to="/login" />}
      />
    </Routes>
  );
}

export default App;