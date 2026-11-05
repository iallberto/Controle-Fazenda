import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface ItemMenuModulo {
  rotulo: string;
  destino: string;
  // Início do módulo: só fica ativo na própria página
  exato?: boolean;
}

// Telas de um módulo pago (Leite, Financeiro, Nutrição). No celular, as abas
// viram um botão com a tela atual que abre a lista (pedido do dono do produto,
// 2026-11-05); a partir de 768 px continuam as abas lado a lado (index.css).
export function MenuDoModulo({ modulo, itens }: { modulo: string; itens: ItemMenuModulo[] }) {
  const [aberto, setAberto] = useState(false);
  const { pathname } = useLocation();
  const atual = itens.find((item) =>
    item.exato ? pathname === item.destino : pathname === item.destino || pathname.startsWith(`${item.destino}/`),
  );
  const idLista = `menu-modulo-${modulo}`;

  return (
    <nav className={`nav-modulo${aberto ? ' aberto' : ''}`} aria-label={modulo}>
      <button
        type="button"
        className="nav-modulo-botao"
        aria-expanded={aberto}
        aria-controls={idLista}
        onClick={() => setAberto((valor) => !valor)}
      >
        <span>
          {modulo}
          {atual && <strong>: {atual.rotulo}</strong>}
        </span>
        <span aria-hidden="true">{aberto ? '▴' : '▾'}</span>
      </button>
      <div id={idLista} className="nav-modulo-itens">
        {itens.map((item) => (
          <NavLink key={item.destino} to={item.destino} end={item.exato} onClick={() => setAberto(false)}>
            {item.rotulo}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
