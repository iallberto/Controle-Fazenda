import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import { buscarDia, formatarLitros, type DiaDeOrdenha } from './api';

// Total do dia por vaca e da fazenda, com o leite para o tanque separado do
// descartado (spec 004, FR-013)
export function OrdenhaDia() {
  const [parametros, setParametros] = useSearchParams();
  const data = parametros.get('data') ?? hojeLocal();
  const [dia, setDia] = useState<DiaDeOrdenha | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarDia(data)
      .then(setDia)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [data]);

  const turnos = dia
    ? [...new Set([...dia.vacas.flatMap((v) => Object.keys(v.turnos)), ...Object.keys(dia.tanque)])].sort()
    : [];

  return (
    <div>
      <header>
        <h1>Ordenha do dia</h1>
        <Link to="/modulos/leite/ordenha">Voltar à ordenha</Link>
      </header>
      <label>
        Data
        <input
          type="date"
          value={data}
          max={hojeLocal()}
          onChange={(e) => e.target.value && setParametros({ data: e.target.value })}
        />
      </label>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {dia && (
        <>
          <dl className="resumo-mes">
            <dt>Leite para o tanque</dt>
            <dd>{formatarLitros(dia.paraTanque)}</dd>
            <dt>Leite descartado</dt>
            <dd className={dia.descartado > 0 ? 'valor-despesa' : undefined}>
              {formatarLitros(dia.descartado)}
            </dd>
          </dl>
          {dia.vacas.length === 0 && Object.keys(dia.tanque).length === 0 ? (
            <p>Nenhuma ordenha lançada neste dia.</p>
          ) : (
            <div className="tabela-rolavel">
              <table>
                <thead>
                  <tr>
                    <th>Vaca</th>
                    {turnos.map((t) => (
                      <th key={t}>{t}º</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dia.vacas.map((v) => (
                    <tr key={v.animalId} className={v.descarte > 0 ? 'linha-descarte' : undefined}>
                      <td>
                        {v.brinco}
                        {v.descarte > 0 && ' (descarte)'}
                      </td>
                      {turnos.map((t) => (
                        <td key={t}>{formatarLitros(v.turnos[t])}</td>
                      ))}
                      <td>{formatarLitros(v.total)}</td>
                    </tr>
                  ))}
                  {Object.keys(dia.tanque).length > 0 && (
                    <tr>
                      <td>Tanque</td>
                      {turnos.map((t) => (
                        <td key={t}>{formatarLitros(dia.tanque[t])}</td>
                      ))}
                      <td>
                        {formatarLitros(Object.values(dia.tanque).reduce((s, l) => s + l, 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
