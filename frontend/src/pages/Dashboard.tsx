import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { buscarPainelInicial, type PainelInicial } from '../api/relatorios';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../api/client';
import { formatarCategoria } from '../utils/formatadores';

export function Dashboard() {
  const { usuario, logout } = useAuth();
  const [painel, setPainel] = useState<PainelInicial | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarPainelInicial()
      .then(setPainel)
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div>
      <header>
        <h1>Controle Fazenda</h1>
        <p>Olá, {usuario?.nome}</p>
        <Link to="/animais">Ver animais</Link><br></br>
        <Link to="/pastos">Ver pastos</Link><br></br>
        <Link to="/configuracao">Configurações</Link><br></br>
        {usuario?.papel === 'DONO' && <Link to="/usuarios">Usuários</Link>}<br></br>
        <Link to="/relatorios">Relatórios</Link><br></br>
        <Link to="/manejo">Manejo</Link>
        <button onClick={logout}>Sair</button>
      </header>

      <main>
        {carregando && <p>Carregando...</p>}
        {erro && <p role="alert">{erro}</p>}

        {painel && (
          <>
            <section>
              <h2>Animais por categoria</h2>
              <ul>
                {painel.porCategoria.map((item) => (
                  <li key={item.categoria}>
                    {formatarCategoria(item.categoria)}: {item.total}
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