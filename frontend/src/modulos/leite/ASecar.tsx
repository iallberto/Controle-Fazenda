import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData } from '../../utils/formatadores';
import { formatarLitros, listarASecar, type VacaASecar } from './api';

// Vacas a secar nos próximos dias, atrasadas primeiro (spec 004, FR-019, FR-020)
export function ASecar() {
  const [vacas, setVacas] = useState<VacaASecar[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    listarASecar()
      .then(setVacas)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  return (
    <div>
      <header>
        <h1>Vacas a secar</h1>
      </header>
      <p className="dica">
        A secagem planejada é o parto previsto (prenhez confirmada na reprodução) menos o prazo das
        configurações do Leite. Para secar, abra a vaca e toque em "Registrar secagem".
      </p>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {vacas && vacas.length === 0 && <p>Nenhuma vaca para secar nos próximos dias.</p>}
      {vacas && vacas.length > 0 && (
        <ul className="lista-vacas">
          {vacas.map((v) => (
            <li key={v.animalId}>
              <Link to={`/modulos/leite/vacas/${v.animalId}`} className="cartao-vaca">
                <strong>Brinco {v.brinco}</strong>
                <span className={v.atrasada ? 'texto-descarte' : undefined}>
                  Secar em {formatarData(v.secagemPlanejada)}
                  {v.atrasada ? ' · atrasada' : ''}
                </span>
                <span>
                  Parto previsto {formatarData(v.partoPrevisto)} · DEL {v.del}
                  {v.mediaUltimos7Dias !== null && ` · média ${formatarLitros(v.mediaUltimos7Dias)}/dia`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
