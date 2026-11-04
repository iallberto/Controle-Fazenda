import { useSearchParams } from 'react-router-dom';
import { RelatorioPorAnimal } from './relatorios/RelatorioPorAnimal';
import { RelatorioPorCategoria } from './relatorios/RelatorioPorCategoria';
import { RelatorioTratamentos } from './relatorios/RelatorioTratamentos';
import { RelatorioProximosTratamentos } from './relatorios/RelatorioProximosTratamentos';
import { RelatorioPorRaca } from './relatorios/RelatorioPorRaca';
import { RelatorioNascimentos } from './relatorios/RelatorioNascimentos';
import { RelatorioVacasAParir } from './relatorios/RelatorioVacasAParir';

// M10: primeiro a pessoa escolhe o tipo de relatório; as datas, quando
// fazem sentido, vêm depois, dentro de cada relatório.
const TIPOS = [
  {
    id: 'vacas-a-parir',
    titulo: 'Vacas a parir',
    descricao: 'Partos previstos nos próximos dias e os atrasados',
    Componente: RelatorioVacasAParir,
  },
  {
    id: 'proximos',
    titulo: 'Próximos tratamentos',
    descricao: 'Doses que vencem nos próximos dias e as atrasadas',
    Componente: RelatorioProximosTratamentos,
  },
  {
    id: 'animal',
    titulo: 'Por animal',
    descricao: 'Histórico completo de um animal',
    Componente: RelatorioPorAnimal,
  },
  {
    id: 'categoria',
    titulo: 'Por tipo de animal',
    descricao: 'Quantos e quais animais em cada categoria',
    Componente: RelatorioPorCategoria,
  },
  {
    id: 'raca',
    titulo: 'Por raça',
    descricao: 'Rebanho ativo dividido por raça, fêmeas e machos',
    Componente: RelatorioPorRaca,
  },
  {
    id: 'tratamentos',
    titulo: 'Tratamentos realizados',
    descricao: 'O que foi aplicado em um período',
    Componente: RelatorioTratamentos,
  },
  {
    id: 'nascimentos',
    titulo: 'Nascimentos e óbitos',
    descricao: 'Nascimentos, natimortos e óbitos por causa em um período',
    Componente: RelatorioNascimentos,
  },
];

export function Relatorios() {
  // O tipo fica na URL (?tipo=...) para o botão "voltar" do navegador funcionar
  const [parametros, setParametros] = useSearchParams();
  const tipoAtual = TIPOS.find((tipo) => tipo.id === parametros.get('tipo'));

  if (tipoAtual) {
    const { Componente } = tipoAtual;
    return (
      <div>
        <header>
          <h1>{tipoAtual.titulo}</h1>
          <button type="button" className="botao-link" onClick={() => setParametros({})}>
            Outros relatórios
          </button>
        </header>
        <Componente />
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1>Relatórios</h1>
      </header>
      <p>Escolha o relatório:</p>
      <div className="opcoes-relatorio">
        {TIPOS.map((tipo) => (
          <button
            key={tipo.id}
            type="button"
            className="cartao-opcao"
            onClick={() => setParametros({ tipo: tipo.id })}
          >
            <strong>{tipo.titulo}</strong>
            <span>{tipo.descricao}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
