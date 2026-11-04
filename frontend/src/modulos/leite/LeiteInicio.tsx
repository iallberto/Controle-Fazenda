import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import { formatarData } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import {
  buscarDia,
  listarVacas,
  formatarLitros,
  type DiaDeOrdenha,
  type VacaResumo,
} from './api';
import { useLeite } from './LeiteContext';

// Início do Leite: atalho para a ordenha, o dia de hoje e as vacas em carência
export function LeiteInicio() {
  const { soConsulta } = useLeite();
  const [vacas, setVacas] = useState<VacaResumo[] | null>(null);
  const [dia, setDia] = useState<DiaDeOrdenha | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([listarVacas('EM_LACTACAO'), buscarDia(hojeLocal())])
      .then(([lista, hoje]) => {
        setVacas(lista);
        setDia(hoje);
      })
      .catch((e) => setErro(mensagemDeErro(e)));
  }, []);

  const emCarencia = vacas?.filter((v) => v.carenciaAte) ?? [];

  return (
    <div>
      <header>
        <h1>Leite</h1>
      </header>

      {soConsulta && (
        <Aviso tipo="atencao">Módulo desativado: só consulta · fale com o suporte para reativar</Aviso>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {!soConsulta && (
        <section className="atalhos-modulo">
          <Link className="botao botao-grande" to="/modulos/leite/ordenha">
            Lançar ordenha
          </Link>
        </section>
      )}

      {emCarencia.length > 0 && (
        <section className="faixa-descarte" aria-label="Leite em descarte">
          <h2>Leite em descarte</h2>
          <ul>
            {emCarencia.map((v) => (
              <li key={v.animalId}>
                Brinco {v.brinco}: descarte até {formatarData(v.carenciaAte)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {vacas && dia && (
        <section>
          <h2>Hoje</h2>
          <dl className="resumo-mes">
            <dt>Vacas em lactação</dt>
            <dd>{vacas.length}</dd>
            <dt>Leite para o tanque</dt>
            <dd>{formatarLitros(dia.paraTanque)}</dd>
            <dt>Leite descartado</dt>
            <dd>{formatarLitros(dia.descartado)}</dd>
          </dl>
          <Link to="/modulos/leite/ordenha/dia">Ver o dia por vaca</Link>
        </section>
      )}

      {vacas && vacas.length === 0 && (
        <p className="dica">
          Nenhuma vaca em lactação ainda. Os partos de vacas de leite registrados a partir de agora
          abrem a lactação sozinhos; as vacas que já estão dando leite entram uma a uma, em{' '}
          <Link to="/modulos/leite/vacas?situacao=TODAS">Vacas</Link>.
        </p>
      )}
    </div>
  );
}
