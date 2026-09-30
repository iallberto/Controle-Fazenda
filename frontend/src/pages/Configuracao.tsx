import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  obterConfiguracao,
  atualizarPreferencias,
  atualizarValorArroba,
  type Configuracao as ConfiguracaoType,
} from '../api/configuracao';

export function Configuracao() {
  const [config, setConfig] = useState<ConfiguracaoType | null>(null);
  const [valoresEditados, setValoresEditados] = useState<Record<string, string>>({});

  function carregar() {
    obterConfiguracao().then((dados) => {
      setConfig(dados);
      const iniciais: Record<string, string> = {};
      dados.valoresArroba.forEach((v) => {
        iniciais[v.categoria] = v.pesoReferenciaKg;
      });
      setValoresEditados(iniciais);
    });
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleNotificacoesChange(valor: boolean) {
    await atualizarPreferencias({ notificacoesAtivas: valor });
    carregar();
  }

  async function handleSomChange(valor: boolean) {
    await atualizarPreferencias({ somAtivo: valor });
    carregar();
  }

  async function handleSalvarArroba(categoria: string) {
    const valor = Number(valoresEditados[categoria]);
    await atualizarValorArroba(categoria, valor);
    carregar();
  }

  if (!config) {
    return <p>Carregando...</p>;
  }

  return (
    <div>
      <header>
        <h1>Configurações</h1>
        <Link to="/">Voltar ao painel</Link>
      </header>

      <section>
        <h2>Notificações</h2>
        <label>
          <input
            type="checkbox"
            checked={config.notificacoesAtivas}
            onChange={(e) => handleNotificacoesChange(e.target.checked)}
          />
          Notificações ativas
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={config.somAtivo}
            onChange={(e) => handleSomChange(e.target.checked)}
          />
          Som ativo
        </label>
      </section>

      <section>
        <h2>Peso de referência da arroba (kg) por categoria</h2>
        {config.valoresArroba.map((valor) => (
          <div key={valor.id}>
            <label htmlFor={`arroba-${valor.categoria}`}>{valor.categoria}</label>
            <input
              id={`arroba-${valor.categoria}`}
              type="number"
              step="0.1"
              value={valoresEditados[valor.categoria] ?? ''}
              onChange={(e) =>
                setValoresEditados({ ...valoresEditados, [valor.categoria]: e.target.value })
              }
            />
            <button onClick={() => handleSalvarArroba(valor.categoria)}>Salvar</button>
          </div>
        ))}
      </section>
    </div>
  );
}