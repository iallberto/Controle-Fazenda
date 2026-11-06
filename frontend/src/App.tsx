import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { TrocarSenha } from './pages/TrocarSenha';
import { Ajuda } from './pages/Ajuda';
import { AdminVencimentos } from './modulos/admin/AdminVencimentos';
import { AdminPrecos } from './modulos/admin/AdminPrecos';
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
import { Semens } from './pages/reproducao/Semens';
import { Inseminacao } from './pages/reproducao/Inseminacao';
import { RotaDeModulo } from './modulos/vitrine/RotaDeModulo';
import { AdminLogin } from './modulos/admin/AdminLogin';
import { AdminLayout } from './modulos/admin/AdminLayout';
import { AdminFazendas } from './modulos/admin/AdminFazendas';
import { AdminFazendaDetalhe } from './modulos/admin/AdminFazendaDetalhe';
import { AdminTrocarSenha } from './modulos/admin/AdminTrocarSenha';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Fora do Layout: é a única tela com senha provisória (spec 007) */}
      <Route path="/trocar-senha" element={<TrocarSenha />} />
      {/* Pública: aberta por quem escaneia o QR da etiqueta, sem login */}
      <Route path="/a/:codigo" element={<ConsultaAnimal />} />
      {/* Painel do dono do software: login e sessão próprios (spec 002) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminFazendas />} />
        <Route path="/admin/fazendas/:id" element={<AdminFazendaDetalhe />} />
        <Route path="/admin/trocar-senha" element={<AdminTrocarSenha />} />
        <Route path="/admin/vencimentos" element={<AdminVencimentos />} />
        <Route path="/admin/precos" element={<AdminPrecos />} />
      </Route>
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
        <Route path="/ajuda" element={<Ajuda />} />
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
        <Route path="/reproducao/inseminacao" element={<Inseminacao />} />
        <Route path="/reproducao/semens" element={<Semens />} />
        {/* Módulos pagos: vitrine, só consulta ou ativo (spec 002) */}
        <Route path="/modulos/:modulo/*" element={<RotaDeModulo />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;