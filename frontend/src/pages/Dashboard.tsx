import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { buscarPainelInicial, type PainelInicial } from '../api/relatorios';
import { mensagemDeErro } from '../api/client';
import { formatarCategoria } from '../utils/formatadores';
import { Aviso } from '../components/Aviso';
import { AvisosDeVencimento } from '../modulos/vitrine/AvisosDeVencimento';

export function Dashboard() {
  const { usuario } = useAuth();
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
        <h1>Painel</h1>
        <p>Olá, {usuario?.nome}</p>
      </header>

      <main>
        <AvisosDeVencimento />
        {carregando && <p>Carregando...</p>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

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