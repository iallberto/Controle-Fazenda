import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buscarVacasVazias, type VacaVazia } from '../../api/relatorios';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarCategoria, formatarData, rotuloBrinco } from '../../utils/formatadores';

// US6: fêmeas vazias, para decidir nova cobertura ou descarte (FR-030).
// Lactantes não aparecem aqui.
export function RelatorioVacasVazias() {
  const [vacas, setVacas] = useState<VacaVazia[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarVacasVazias()
      .then(setVacas)
      .catch((erroRequisicao) => setErro(mensagemDeErro(erroRequisicao)));
  }, []);

  if (erro) return <Aviso tipo="erro">{erro}</Aviso>;
  if (!vacas) return <p>Carregando...</p>;

  return (
    <>
      <section>
        <h2>Vazias ({vacas.length})</h2>
        {vacas.length === 0 ? (
          <p>Nenhuma fêmea vazia no rebanho.</p>
        ) : (
          <ul>
            {vacas.map((vaca) => (
              <li key={vaca.animal.id}>
                <Link to={`/animais/${vaca.animal.id}`}>{rotuloBrinco(vaca.animal.brinco)}</Link> ·{' '}
                {formatarCategoria(vaca.animal.categoria)}
                {vaca.pasto && ` · ${vaca.pasto}`}
                <br />
                <small>
                  {vaca.ultimoParto
                    ? `último parto em ${formatarData(vaca.ultimoParto)} (${vaca.diasDesdeParto === 0 ? 'hoje' : vaca.diasDesdeParto === 1 ? 'há 1 dia' : `há ${vaca.diasDesdeParto} dias`})`
                    : 'nunca pariu'}
                  {vaca.ultimaCobertura && ` · última cobertura em ${formatarData(vaca.ultimaCobertura)}`}
                  {vaca.ultimoDiagnostico && ` · diagnóstico em ${formatarData(vaca.ultimoDiagnostico)}`}
                </small>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="dica">
        Vazia é a fêmea diagnosticada vazia, que perdeu a gestação ou teve natimorto. Quem pariu com cria viva fica
        como lactante e não entra nesta lista.
      </p>
    </>
  );
}
