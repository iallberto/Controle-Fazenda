import { Link } from 'react-router-dom';
import { ROTA_DO_MODULO } from '../../api/modulos';
import { useModulos } from '../../contexts/useModulos';
import { formatarData, formatarSituacaoModulo, ROTULOS_MODULO } from '../../utils/formatadores';

const CLASSES = {
  ATIVO: 'selo selo-ativo',
  SO_CONSULTA: 'selo selo-consulta',
  NAO_CONTRATADO: 'selo selo-inativo',
} as const;

// Seção das Configurações com os módulos contratados e o término (FR-016)
export function ModulosContratados() {
  const { modulos } = useModulos();
  if (!modulos) return null;

  return (
    <section>
      <h2>Módulos contratados</h2>
      <ul>
        {modulos.map((item) => (
          <li key={item.modulo}>
            <Link to={`/modulos/${ROTA_DO_MODULO[item.modulo]}`}>{ROTULOS_MODULO[item.modulo]}</Link>{' '}
            <span className={CLASSES[item.situacao]}>{formatarSituacaoModulo(item.situacao)}</span>
            {item.situacao === 'ATIVO' &&
              (item.dataTermino ? ` até ${formatarData(item.dataTermino)}` : ' · sem data de término')}
          </li>
        ))}
      </ul>
      <p className="dica">Para contratar, renovar ou cancelar um módulo, fale com o suporte.</p>
    </section>
  );
}
