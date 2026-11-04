import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { useModulos } from '../../contexts/useModulos';
import { formatarData, formatarReais } from '../../utils/formatadores';
import { buscarVendaDoAnimal, type VendaDoAnimal } from './api';

interface AnimalResumo {
  id: string;
  status: string;
  dataStatus?: string | null;
}

// Venda na página do animal (spec 003, FR-016, FR-016a):
// - animal ativo, Financeiro ativo, dono: atalho para vender;
// - animal vendido: o dono vê a venda (data, comprador, peso, valor da parte);
//   o funcionário vê só que foi vendido e quando.
export function BlocoVendaDoAnimal({ animal }: { animal: AnimalResumo }) {
  const { usuario } = useAuth();
  const { situacaoDe } = useModulos();
  const ehDono = usuario?.papel === 'DONO';
  const situacao = situacaoDe('FINANCEIRO')?.situacao ?? 'NAO_CONTRATADO';
  const comFinanceiro = situacao !== 'NAO_CONTRATADO';
  const [venda, setVenda] = useState<VendaDoAnimal | null>(null);

  useEffect(() => {
    if (!ehDono || !comFinanceiro || animal.status !== 'VENDIDO') return;
    buscarVendaDoAnimal(animal.id)
      .then(setVenda)
      // Vendido antes do Financeiro (sem venda registrada): nada a mostrar
      .catch(() => setVenda(null));
  }, [ehDono, comFinanceiro, animal.id, animal.status]);

  if (animal.status === 'ATIVO') {
    if (situacao !== 'ATIVO') return null;
    return (
      <section>
        <h2>Venda</h2>
        {ehDono ? (
          <Link className="botao" to={`/modulos/financeiro/vendas/nova?animal=${animal.id}`}>
            Vender este animal
          </Link>
        ) : (
          <p>A venda é registrada pelo dono, no Financeiro.</p>
        )}
      </section>
    );
  }

  if (animal.status !== 'VENDIDO') return null;

  return (
    <section>
      <h2>Venda</h2>
      {ehDono && venda ? (
        <p>
          Vendido em {formatarData(venda.data)} para {venda.comprador}
          {venda.pesoKg !== null && ` · ${String(venda.pesoKg).replace('.', ',')} kg`}
          {` · ${formatarReais(venda.valorCentavos)}`}
          <br />
          <Link to={`/modulos/financeiro/vendas/${venda.vendaId}`}>Ver a venda</Link>
        </p>
      ) : (
        <p>Vendido{animal.dataStatus ? ` em ${formatarData(animal.dataStatus)}` : ''}.</p>
      )}
    </section>
  );
}
