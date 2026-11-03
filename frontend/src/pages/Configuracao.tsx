import { useEffect, useState } from 'react';
import {
  obterConfiguracao,
  atualizarPreferencias,
  atualizarValorArroba,
  type Configuracao as ConfiguracaoType,
} from '../api/configuracao';
import { mensagemDeErro } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { formatarCategoria } from '../utils/formatadores';
import { Aviso } from '../components/Aviso';

export function Configuracao() {
  const [config, setConfig] = useState<ConfiguracaoType | null>(null);
  const [valoresEditados, setValoresEditados] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const { usuario } = useAuth();
  // Só o dono altera as configurações; o funcionário apenas consulta
  const somenteLeitura = usuario?.papel !== 'DONO';

  function carregar() {
    obterConfiguracao()
      .then((dados) => {
        setConfig(dados);
        const iniciais: Record<string, string> = {};
        dados.valoresArroba.forEach((v) => {
          iniciais[v.categoria] = v.pesoReferenciaKg;
        });
        setValoresEditados(iniciais);
      })
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }

  async function salvar(acao: () => Promise<unknown>) {
    setErro('');
    setSucesso('');
    try {
      await acao();
      setSucesso('Configuração salva.');
      carregar();
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível salvar.'));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function handleNotificacoesChange(valor: boolean) {
    return salvar(() => atualizarPreferencias({ notificacoesAtivas: valor }));
  }

  function handleSomChange(valor: boolean) {
    return salvar(() => atualizarPreferencias({ somAtivo: valor }));
  }

  function handleSalvarArroba(categoria: string) {
    const valor = Number(valoresEditados[categoria]);
    return salvar(() => atualizarValorArroba(categoria, valor));
  }

  if (!config) {
    return erro ? <Aviso tipo="erro">{erro}</Aviso> : <p>Carregando...</p>;
  }

  return (
    <div>
      <header>
        <h1>Configurações</h1>
      </header>

      {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {somenteLeitura && <p>Somente o dono da fazenda pode alterar as configurações.</p>}

      <section>
        <h2>Notificações</h2>
        <label>
          <input
            type="checkbox"
            checked={config.notificacoesAtivas}
            disabled={somenteLeitura}
            onChange={(e) => handleNotificacoesChange(e.target.checked)}
          />
          Notificações ativas
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={config.somAtivo}
            disabled={somenteLeitura}
            onChange={(e) => handleSomChange(e.target.checked)}
          />
          Som ativo
        </label>
      </section>

      <section>
        <h2>Peso de referência da arroba (kg) por categoria</h2>
        {config.valoresArroba.map((valor) => (
          <div key={valor.id} className="linha-arroba">
            <label htmlFor={`arroba-${valor.categoria}`}>{formatarCategoria(valor.categoria)}</label>
            <input
              id={`arroba-${valor.categoria}`}
              type="number"
              step="0.1"
              value={valoresEditados[valor.categoria] ?? ''}
              disabled={somenteLeitura}
              onChange={(e) =>
                setValoresEditados({ ...valoresEditados, [valor.categoria]: e.target.value })
              }
            />
            {!somenteLeitura && (
              <button onClick={() => handleSalvarArroba(valor.categoria)}>Salvar</button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}