import { Fragment, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Aviso } from './Aviso';
import { Logo } from './Logo';
import { FaixaSuporte } from './FaixaSuporte';
import { AvisoPrazo } from './AvisoPrazo';
import { useModulos } from '../contexts/useModulos';
import { ROTA_DO_MODULO, type ModuloPago } from '../api/modulos';
import { ROTULOS_MODULO } from '../utils/formatadores';

interface ItemMenu {
  rotulo: string;
  destino: string;
  somenteDono?: boolean;
  // Selo ao lado do nome: "só consulta" ou "disponível" (spec 002)
  selo?: { texto: string; classe: string };
}

const MODULOS_NO_MENU: ModuloPago[] = ['LEITE', 'FINANCEIRO', 'NUTRICAO'];

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
    titulo: 'Reprodução',
    itens: [
      { rotulo: 'Estações de monta', destino: '/reproducao/estacoes' },
      { rotulo: 'Diagnóstico de gestação', destino: '/reproducao/diagnostico' },
      { rotulo: 'Inseminação', destino: '/reproducao/inseminacao' },
      { rotulo: 'Sêmen', destino: '/reproducao/semens' },
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
  '/reproducao/estacoes/nova': 'Nova estação de monta',
  '/ajuda': 'Ajuda',
  '/modulos/leite': 'Leite',
  '/modulos/financeiro': 'Financeiro',
  '/modulos/nutricao': 'Nutrição',
};

function tituloDaRota(caminho: string) {
  if (TITULOS[caminho]) return TITULOS[caminho];
  if (caminho.startsWith('/animais/')) return 'Animal';
  if (caminho.startsWith('/reproducao/estacoes/')) return 'Estação de monta';
  if (caminho.startsWith('/modulos/financeiro')) return 'Financeiro';
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

  // Menu em sanfona (pedido do dono do produto, 2026-11-05): um grupo aberto
  // por vez. Começa aberto o grupo da tela atual; abrir outro fecha o anterior,
  // e clicar no aberto fecha. undefined = ainda segue a tela atual.
  const [grupoEscolhido, setGrupoEscolhido] = useState<string | null | undefined>(undefined);

  // Módulos liberados como itens diretos do menu, acima de Gestão, na ordem
  // Leite, Financeiro, Nutrição (pedido do dono do produto, 2026-11-05). Os não
  // contratados não aparecem; o desativado continua, só para consulta (FR-014).
  const { situacaoDe } = useModulos();
  const modulosNoMenu = MODULOS_NO_MENU.flatMap((modulo): ItemMenu[] => {
    const situacao = situacaoDe(modulo)?.situacao ?? 'NAO_CONTRATADO';
    if (situacao === 'NAO_CONTRATADO') return [];
    return [
      {
        rotulo: ROTULOS_MODULO[modulo],
        destino: `/modulos/${ROTA_DO_MODULO[modulo]}`,
        selo: situacao === 'SO_CONSULTA' ? { texto: 'só consulta', classe: 'selo selo-consulta' } : undefined,
      },
    ];
  });
  const grupos = GRUPOS_MENU.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.filter(
      (item) =>
        (!item.somenteDono || usuario?.papel === 'DONO') &&
        // O acesso de suporte não mexe em usuários (spec 008, FR-005)
        !(usuario?.suporte && item.destino === '/usuarios'),
    ),
  }));
  // Grupo da tela atual: endereço exato primeiro ("/animais/novo" é de Registrar),
  // depois o começo do endereço ("/animais/123" é de Rebanho)
  const caminho = location.pathname;
  const grupoDaTela =
    grupos.find((grupo) => grupo.itens.some((item) => item.destino === caminho)) ??
    grupos.find((grupo) =>
      grupo.itens.some((item) => item.destino !== '/' && caminho.startsWith(`${item.destino}/`)),
    );
  const grupoAberto = grupoEscolhido === undefined ? grupoDaTela?.titulo : grupoEscolhido;

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
        {grupos.map((grupo) => {
          const itens = grupo.itens;
          const aberto = grupoAberto === grupo.titulo;
          const idLista = `menu-grupo-${grupo.titulo}`;
          return (
            <Fragment key={grupo.titulo}>
              {grupo.titulo === 'Gestão' &&
                modulosNoMenu.map((modulo) => (
                  <NavLink
                    key={modulo.destino}
                    to={modulo.destino}
                    className="menu-modulo"
                    onClick={() => {
                      // O destaque passa para o módulo: fecha o grupo que estava aberto
                      setGrupoEscolhido(undefined);
                      fecharMenu();
                    }}
                  >
                    <span>{modulo.rotulo}</span>
                    {modulo.selo && <span className={`${modulo.selo.classe} selo-menu`}>{modulo.selo.texto}</span>}
                  </NavLink>
                ))}
              <div className={`menu-grupo${aberto ? ' menu-grupo-aberto' : ''}`}>
                <button
                  type="button"
                  className="menu-titulo"
                  aria-expanded={aberto}
                  aria-controls={idLista}
                  onClick={() => setGrupoEscolhido(aberto ? null : grupo.titulo)}
                >
                  <span>{grupo.titulo}</span>
                  <span className="menu-seta" aria-hidden="true">
                    {aberto ? '▾' : '▸'}
                  </span>
                </button>
                <ul id={idLista} hidden={!aberto}>
                  {itens.map((item) => (
                    <li key={item.destino}>
                      {/* end: "/animais" não fica ativo em "/animais/novo" */}
                      <NavLink to={item.destino} end onClick={fecharMenu}>
                        {item.rotulo}
                        {item.selo && <span className={`${item.selo.classe} selo-menu`}>{item.selo.texto}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            </Fragment>
          );
        })}
        <NavLink to="/ajuda" className="menu-trocar-senha" onClick={fecharMenu}>
          Ajuda
        </NavLink>
        {!usuario?.suporte && (
          <Link to="/trocar-senha" className="menu-trocar-senha" onClick={fecharMenu}>
            Trocar minha senha
          </Link>
        )}
        <button type="button" className="botao-sair" onClick={logout}>
          Sair
        </button>
      </nav>

      <main className="conteudo">
        <FaixaSuporte />
        <AvisoPrazo />
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
