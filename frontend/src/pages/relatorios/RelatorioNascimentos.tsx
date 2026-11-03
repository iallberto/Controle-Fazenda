import { useState, type FormEvent } from 'react';
import {
  buscarNascimentos,
  buscarNatimortos,
  buscarObitosPorCausa,
  type NascimentoOuNatimorto,
  type ObitoPorCausa,
} from '../../api/relatorios';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { FiltroPeriodo } from './FiltroPeriodo';
import { formatarData } from '../../utils/formatadores';

interface Resultado {
  nascimentos: NascimentoOuNatimorto[];
  natimortos: NascimentoOuNatimorto[];
  obitos: ObitoPorCausa[];
}

export function RelatorioNascimentos() {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleGerar(evento: FormEvent, inicio: string, fim: string) {
    evento.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      const [nascimentos, natimortos, obitos] = await Promise.all([
        buscarNascimentos(inicio, fim),
        buscarNatimortos(inicio, fim),
        buscarObitosPorCausa(inicio, fim),
      ]);
      setResultado({ nascimentos, natimortos, obitos });
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível gerar o relatório.'));
    } finally {
      setCarregando(false);
    }
  }

  const totalCrias = resultado?.nascimentos.reduce((soma, parto) => soma + (parto.crias?.length ?? 0), 0);

  return (
    <>
      <FiltroPeriodo aoGerar={handleGerar} />
      {carregando && <p>Carregando...</p>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {resultado && !carregando && (
        <>
          <section>
            <h2>
              Nascimentos ({totalCrias} {totalCrias === 1 ? 'cria' : 'crias'} em{' '}
              {resultado.nascimentos.length} {resultado.nascimentos.length === 1 ? 'parto' : 'partos'})
            </h2>
            <ul>
              {resultado.nascimentos.map((parto) => (
                <li key={parto.id}>
                  {formatarData(parto.data)} — {parto.crias?.length ?? 0} cria(s)
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Natimortos ({resultado.natimortos.length})</h2>
            <ul>
              {resultado.natimortos.map((parto) => (
                <li key={parto.id}>{formatarData(parto.data)}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2>Óbitos por causa</h2>
            {resultado.obitos.length === 0 ? (
              <p>Nenhum óbito no período.</p>
            ) : (
              <ul>
                {resultado.obitos.map((item) => (
                  <li key={item.motivo}>
                    {item.motivo}: {item.total}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
