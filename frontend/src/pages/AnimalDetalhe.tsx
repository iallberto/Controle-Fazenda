import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { buscarAnimal, type Animal } from '../api/animais';
import { listarTratamentosPorAnimal, type Tratamento } from '../api/tratamentos';
import { listarPartosPorMae, type Parto } from '../api/partos';

interface PartoComIntervalo extends Parto {
  diasDesdeUltimoParto: number | null;
}

function calcularIntervalos(partos: Parto[]): PartoComIntervalo[] {
  const ordenados = [...partos].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
  );

  return ordenados.map((parto, indice) => {
    if (indice === 0) {
      return { ...parto, diasDesdeUltimoParto: null };
    }
    const dataAtual = new Date(parto.data).getTime();
    const dataAnterior = new Date(ordenados[indice - 1].data).getTime();
    const dias = Math.round((dataAtual - dataAnterior) / (1000 * 60 * 60 * 24));
    return { ...parto, diasDesdeUltimoParto: dias };
  });
}

export function AnimalDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [tratamentos, setTratamentos] = useState<Tratamento[]>([]);
  const [partos, setPartos] = useState<PartoComIntervalo[]>([]);

  useEffect(() => {
    if (!id) return;

    buscarAnimal(id).then((dadosAnimal) => {
      setAnimal(dadosAnimal);
      if (dadosAnimal.categoria === 'MATRIZ') {
        listarPartosPorMae(id).then((dadosPartos) => {
          setPartos(calcularIntervalos(dadosPartos));
        });
      }
    });

    listarTratamentosPorAnimal(id).then(setTratamentos);
  }, [id]);

  if (!animal) {
    return <p>Carregando...</p>;
  }

  return (
    <div>
      <header>
        <h1>Animal {animal.brinco}</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <section>
        <h2>Dados gerais</h2>
        <p>Sexo: {animal.sexo}</p>
        <p>Categoria: {animal.categoria}</p>
        <p>Status: {animal.status}</p>
        <p>Nascimento: {animal.dataNascimento}</p>
      </section>

      {animal.categoria === 'MATRIZ' && (
        <section>
          <h2>Histórico de partos ({partos.length})</h2>
          {partos.length === 0 && <p>Nenhum parto registrado ainda.</p>}
          <ul>
            {partos.map((parto) => (
              <li key={parto.id}>
                {parto.data} — {parto.resultado} ({parto.tipo})
                {parto.diasDesdeUltimoParto !== null && (
                  <> — {parto.diasDesdeUltimoParto} dias desde o parto anterior</>
                )}
                {parto.crias.length > 0 && (
                  <> — crias: {parto.crias.map((c) => c.brinco).join(', ')}</>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Tratamentos ({tratamentos.length})</h2>
        {tratamentos.length === 0 && <p>Nenhum tratamento registrado ainda.</p>}
        <ul>
          {tratamentos.map((tratamento) => (
            <li key={tratamento.id}>
              {tratamento.data} — {tratamento.produto} ({tratamento.responsavel})
              {tratamento.proximaDataPrevista && (
                <> — próxima aplicação prevista: {tratamento.proximaDataPrevista}</>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}