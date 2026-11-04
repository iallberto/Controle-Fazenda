import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useModulos } from '../../contexts/useModulos';
import { formatarData } from '../../utils/formatadores';
import { buscarVaca, type VacaDetalhe } from './api';

// Leite na página do animal (spec 004, FR-004b, FR-006): para fêmeas, com o
// Leite ativo ou só consulta — situação, DEL, carência e o atalho para a vaca
// no Leite (onde se inicia a lactação e se marca "vaca de leite")
export function BlocoLeiteDoAnimal({ animal }: { animal: { id: string; sexo: string; status: string } }) {
  const { situacaoDe } = useModulos();
  const situacao = situacaoDe('LEITE')?.situacao ?? 'NAO_CONTRATADO';
  const aplicavel = situacao !== 'NAO_CONTRATADO' && animal.sexo === 'F';
  const [vaca, setVaca] = useState<VacaDetalhe | null>(null);

  useEffect(() => {
    if (!aplicavel) return;
    buscarVaca(animal.id)
      .then(setVaca)
      .catch(() => setVaca(null));
  }, [aplicavel, animal.id]);

  if (!aplicavel || !vaca) return null;

  return (
    <section>
      <h2>Leite</h2>
      {vaca.lactacaoAtual ? (
        <p>
          Em lactação desde {formatarData(vaca.lactacaoAtual.inicio)} · DEL {vaca.lactacaoAtual.del}
        </p>
      ) : (
        <p>
          {vaca.situacao === 'SECA' ? 'Seca' : 'Sem lactação registrada'}
          {vaca.ehVacaDeLeite ? '' : ' · não é vaca de leite'}
        </p>
      )}
      {vaca.carenciaAte && (
        <p className="faixa-descarte">Leite descarte até {formatarData(vaca.carenciaAte)}</p>
      )}
      <Link to={`/modulos/leite/vacas/${animal.id}`}>Abrir no Leite</Link>
    </section>
  );
}
