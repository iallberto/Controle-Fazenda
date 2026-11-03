import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Aviso } from './Aviso';
import { Logo } from './Logo';

interface ItemMenu {
  rotulo: string;
  destino: string;
  somenteDono?: boolean;
}

const GRUPOS_MENU: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: 'Início',
    itens: [
      { rotulo: 'Painel', destino: '/' },
      { rotulo: 'Manejo', destino: '/manejo' },
      { rotulo: 'Manejo em lote', destino: '/manejo/lote' },
    ],
  },
  {
    titulo: 'Rebanho',
    itens: [
      { rotulo: 'Animais', destino: '/animais' },
      { rotulo: 'Pastos', destino: '/pastos' },
      { rotulo: 'QR codes', destino: '/qrcodes' },
    ],
  },
  {
    titulo: 'Registrar',
    itens: [
      { rotulo: 'Cadastrar animal', destino: '/animais/novo' },
      { rotulo: 'Parto', destino: '/partos/novo' },
      { rotulo: 'Tratamento', destino: '/tratamentos/novo' },
      { rotulo: 'Pesagem', destino: '/pesagens/novo' },
      { rotulo: 'Mover animal', destino: '/animais/mover' },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { rotulo: 'Relatórios', destino: '/relatorios' },
      { rotulo: 'Configurações', destino: '/configuracao' },
      { rotulo: 'Usuários', destino: '/usuarios', somenteDono: true },
    ],
  },
];

// Título da aba do navegador (M15). Rotas fora do menu entram aqui à parte.
const TITULOS: Record<string, string> = {
  ...Object.fromEntries(
    GRUPOS_MENU.flatMap((grupo) => grupo.itens.map((item) => [item.destino, item.rotulo])),
  ),
  '/partos/novo': 'Registrar parto',
  '/tratamentos/novo': 'Registrar tratamento',
  '/pesagens/novo': 'Registrar pesagem',
  '/veterinarios/novo': 'Novo veterinário',
};

function tituloDaRota(caminho: string) {
  if (TITULOS[caminho]) return TITULOS[caminho];
  if (caminho.startsWith('/animais/')) return 'Animal';
  return null;
}

// Abaixo de 768 px o menu fica recolhido atrás do botão; acima, fixo na lateral
// (a regra de largura está no index.css). O atalho do Manejo fica sempre na barra
// do topo, porque a tela é usada no curral com pressa e mão suja.
export function Layout() {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Telas de cadastro mandam a confirmação junto com o redirecionamento:
  // navigate(destino, { state: { aviso: 'Animal cadastrado.' } })
  const avisoNavegacao = (location.state as { aviso?: string } | null)?.aviso;

  useEffect(() => {
    const titulo = tituloDaRota(location.pathname);
    document.title = titulo ? `${titulo} · Controle Fazenda` : 'Controle Fazenda';
  }, [location.pathname]);

  useEffect(() => {
    if (!menuAberto) return;
    function fecharComEsc(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setMenuAberto(false);
    }
    document.addEventListener('keydown', fecharComEsc);
    return () => document.removeEventListener('keydown', fecharComEsc);
  }, [menuAberto]);

  const fecharMenu = () => setMenuAberto(false);

  return (
    <div className="layout">
      <header className="barra-topo nao-imprimir">
        <button
          type="button"
          className="botao-menu"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link to="/" className="marca">
          <Logo tamanho={26} />
          Controle Fazenda
        </Link>
        <NavLink to="/manejo" end className="atalho-manejo">
          Manejo
        </NavLink>
      </header>

      {menuAberto && <div className="fundo-menu nao-imprimir" onClick={fecharMenu} />}

      <nav
        id="menu-principal"
        className={`menu nao-imprimir${menuAberto ? ' aberto' : ''}`}
        aria-label="Menu principal"
      >
        <p className="menu-marca">
          <Logo tamanho={30} />
          Controle Fazenda
        </p>
        <p className="menu-usuario">Olá, {usuario?.nome}</p>
        {GRUPOS_MENU.map((grupo) => {
          const itens = grupo.itens.filter(
            (item) => !item.somenteDono || usuario?.papel === 'DONO',
          );
          return (
            <div key={grupo.titulo} className="menu-grupo">
              <p className="menu-titulo">{grupo.titulo}</p>
              <ul>
                {itens.map((item) => (
                  <li key={item.destino}>
                    {/* end: "/animais" não fica ativo em "/animais/novo" */}
                    <NavLink to={item.destino} end onClick={fecharMenu}>
                      {item.rotulo}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <button type="button" className="botao-sair" onClick={logout}>
          Sair
        </button>
      </nav>

      <main className="conteudo">
        {avisoNavegacao && (
          <Aviso
            tipo="sucesso"
            aoFechar={() =>
              navigate(location.pathname + location.search, { replace: true, state: null })
            }
          >
            {avisoNavegacao}
          </Aviso>
        )}
        <Outlet />
      </main>
    </div>
  );
}
