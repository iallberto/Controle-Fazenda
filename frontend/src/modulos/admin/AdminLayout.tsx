import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { administradorLogado, sairDoPainel } from './api';

// Moldura do painel do administrador: sem o menu das fazendas, porque o
// administrador não usa nenhuma tela de rebanho (FR-021).
export function AdminLayout() {
  const administrador = administradorLogado();
  const navigate = useNavigate();

  if (!administrador) return <Navigate to="/admin/login" replace />;

  return (
    <div className="layout-admin">
      <header className="barra-topo">
        <Link to="/admin" className="marca">
          <Logo tamanho={26} />
          Painel do administrador
        </Link>
        <Link to="/admin/trocar-senha" className="link-trocar-senha-admin">
          Trocar minha senha
        </Link>
        <button
          type="button"
          className="botao-sair-admin"
          onClick={() => {
            sairDoPainel();
            navigate('/admin/login');
          }}
        >
          Sair
        </button>
      </header>
      <main className="conteudo">
        <p className="admin-usuario">Administrador: {administrador.nome}</p>
        <nav className="grupo-botoes nav-admin" aria-label="Painel">
          <NavLink to="/admin" end>
            Fazendas
          </NavLink>
          <NavLink to="/admin/vencimentos">Próximos a vencer</NavLink>
          <NavLink to="/admin/precos">Preços</NavLink>
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
