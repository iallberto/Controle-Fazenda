import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { buscarPainelInicial, type PainelInicial } from '../api/relatorios';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { usuario, logout } = useAuth();
  const [painel, setPainel] = useState<PainelInicial | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    buscarPainelInicial()
      .then(setPainel)
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div>
      <header>
        <h1>Controle Fazenda</h1>
        <p>Olá, {usuario?.nome}</p>
        <Link to="/animais">Ver animais</Link>
        <Link to="/pastos">Ver pastos</Link>
        <button onClick={logout}>Sair</button>
      </header>

      <main>
        {carregando && <p>Carregando...</p>}

        {painel && (
          <>
            <section>
              <h2>Animais por categoria</h2>
              <ul>
                {painel.porCategoria.map((item) => (
                  <li key={item.categoria}>
                    {item.categoria}: {item.total}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Animais por pasto</h2>
              <ul>
                {painel.porPasto.map((item) => (
                  <li key={item.pasto ?? 'sem-pasto'}>
                    {item.pasto ?? 'Sem pasto definido'}: {item.total}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p>Nascimentos no mês: {painel.nascimentosNoMes}</p>
              <p>Óbitos no mês: {painel.obitosNoMes}</p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}