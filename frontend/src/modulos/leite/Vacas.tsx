import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData } from '../../utils/formatadores';
import { listarVacas, type VacaResumo } from './api';

type Filtro = 'EM_LACTACAO' | 'SECA' | 'TODAS';

const ROTULOS: Record<Filtro, string> = {
  EM_LACTACAO: 'Em lactação',
  SECA: 'Secas',
  TODAS: 'Todas as vacas de leite',
};

const SITUACAO: Record<VacaResumo['situacao'], string> = {
  EM_LACTACAO: 'Em lactação',
  SECA: 'Seca',
  NENHUMA: 'Sem lactação registrada',
};

// Vacas de leite (spec 004, US1): em lactação com DEL, secas, e todas — onde
// se incluem as que já davam leite antes do módulo (FR-006)
export function Vacas() {
  const [parametros, setParametros] = useSearchParams();
  const filtro = (parametros.get('situacao') as Filtro) || 'EM_LACTACAO';
  const [vacas, setVacas] = useState<VacaResumo[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarVacas(filtro)
      .then(setVacas)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [filtro]);

  return (
    <div>
      <header>
        <h1>Vacas</h1>
      </header>
      <div className="nav-modulo" role="group" aria-label="Filtro">
        {(Object.keys(ROTULOS) as Filtro[]).map((f) => (
          <button
            key={f}
            type="button"
            className={f === filtro ? 'turno-ativo' : 'botao-secundario'}
            aria-pressed={f === filtro}
            onClick={() => {
              setVacas(null);
              setParametros({ situacao: f });
            }}
          >
            {ROTULOS[f]}
          </button>
        ))}
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {filtro === 'TODAS' && (
        <p className="dica">
          Vaca de leite = de raça leiteira ou marcada pelo dono. Para incluir uma vaca que já está
          dando leite, abra a vaca e toque em "Iniciar lactação".
        </p>
      )}
      {vacas && vacas.length === 0 && <p>Nenhuma vaca nesta lista.</p>}
      {vacas && vacas.length > 0 && (
        <ul className="lista-vacas">
          {vacas.map((v) => (
            <li key={v.animalId}>
              <Link to={`/modulos/leite/vacas/${v.animalId}`} className="cartao-vaca">
                <strong>Brinco {v.brinco}</strong>
                <span>
                  {v.raca ?? 'Sem raça'} · {SITUACAO[v.situacao]}
                  {v.del !== null && ` · DEL ${v.del}`}
                </span>
                {v.secagemPlanejada && <span>Secar em {formatarData(v.secagemPlanejada)}</span>}
                {v.carenciaAte && (
                  <span className="texto-descarte">Leite descarte até {formatarData(v.carenciaAte)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
