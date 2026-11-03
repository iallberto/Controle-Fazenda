import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { buscarTratamentosPorPeriodo, type TratamentoRelatorio } from '../../api/relatorios';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { FiltroPeriodo } from './FiltroPeriodo';
import { formatarData, rotuloBrinco } from '../../utils/formatadores';

export function RelatorioTratamentos() {
  const [tratamentos, setTratamentos] = useState<TratamentoRelatorio[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleGerar(evento: FormEvent, inicio: string, fim: string) {
    evento.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      setTratamentos(await buscarTratamentosPorPeriodo(inicio, fim));
    } catch (erroRequisicao) {
      setErro(mensagemDeErro(erroRequisicao, 'Não foi possível gerar o relatório.'));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <FiltroPeriodo aoGerar={handleGerar} />
      {carregando && <p>Carregando...</p>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {tratamentos && !carregando && (
        <section>
          <h2>Tratamentos ({tratamentos.length})</h2>
          {tratamentos.length === 0 ? (
            <p>Nenhum tratamento no período.</p>
          ) : (
            <ul>
              {tratamentos.map((tratamento) => (
                <li key={tratamento.id}>
                  <strong>{formatarData(tratamento.data)}</strong> — {tratamento.produto} —{' '}
                  <Link to={`/animais/${tratamento.animal.id}`}>
                    {rotuloBrinco(tratamento.animal.brinco)}
                  </Link>
                  {tratamento.responsavel && <> · aplicado por {tratamento.responsavel}</>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
