import { useState, type FormEvent } from 'react';
import { hojeLocal, primeiroDiaDoMesLocal } from '../../utils/datas';

interface FiltroPeriodoProps {
  aoGerar: (evento: FormEvent, inicio: string, fim: string) => void;
}

// Período dos relatórios que dependem de datas. Já começa no mês atual,
// que é o filtro mais usado, para não obrigar a preencher as duas datas.
export function FiltroPeriodo({ aoGerar }: FiltroPeriodoProps) {
  const [inicio, setInicio] = useState(primeiroDiaDoMesLocal);
  const [fim, setFim] = useState(hojeLocal);

  return (
    <form onSubmit={(evento) => aoGerar(evento, inicio, fim)}>
      <div>
        <label htmlFor="inicio">De</label>
        <input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="fim">Até</label>
        <input
          id="fim"
          type="date"
          value={fim}
          min={inicio}
          onChange={(e) => setFim(e.target.value)}
          required
        />
      </div>
      <button type="submit">Gerar relatório</button>
    </form>
  );
}
