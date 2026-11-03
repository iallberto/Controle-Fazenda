import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { consultarAnimalPublico, type ConsultaPublica } from '../api/publico';
import {
  formatarArrobas,
  formatarCategoria,
  formatarData,
  formatarIdade,
  formatarNumeroEtiqueta,
  formatarOrigem,
  formatarPeso,
  formatarSexo,
} from '../utils/formatadores';
import { Aviso } from '../components/Aviso';

// Página aberta a quem escaneia o QR da etiqueta (comprador ou visitante), sem login.
// Mostra o essencial de cara e deixa os históricos recolhidos para a tela não ficar longa.
export function ConsultaAnimal() {
  const { codigo = '' } = useParams();
  const [consulta, setConsulta] = useState<ConsultaPublica | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    consultarAnimalPublico(codigo)
      .then(setConsulta)
      .catch((erroRequisicao) => {
        const status = axios.isAxiosError(erroRequisicao) ? erroRequisicao.response?.status : undefined;
        if (status === 404) {
          setErro('Etiqueta não encontrada. Confira se o QR code foi lido por inteiro.');
        } else if (status === 429) {
          setErro('Muitas consultas seguidas. Aguarde um minuto e tente de novo.');
        } else {
          setErro('Não foi possível carregar os dados agora. Tente de novo em instantes.');
        }
      })
      .finally(() => setCarregando(false));
  }, [codigo]);

  if (carregando) {
    return (
      <div className="pagina-publica">
        <p>Carregando...</p>
      </div>
    );
  }

  if (erro || !consulta) {
    return (
      <div className="pagina-publica">
        <h1>Consulta de animal</h1>
        <Aviso tipo="erro">{erro}</Aviso>
      </div>
    );
  }

  const { fazenda, animal, situacao } = consulta;

  if (situacao !== 'ATIVO' || !animal) {
    return (
      <div className="pagina-publica">
        <p className="publica-fazenda">{fazenda.nome}</p>
        <h1>Consulta de animal</h1>
        <section>
          <p>
            {situacao === 'ETIQUETA_SUBSTITUIDA'
              ? 'Esta etiqueta foi substituída por uma nova. Escaneie a etiqueta atual do animal.'
              : 'Este animal não faz mais parte do rebanho desta fazenda.'}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="pagina-publica">
      <p className="publica-fazenda">{fazenda.nome}</p>
      <h1>Brinco {formatarNumeroEtiqueta(animal.brinco)}</h1>
      <p className="publica-resumo">
        {[formatarCategoria(animal.categoria), animal.raca, formatarSexo(animal.sexo)]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <section className="publica-peso">
        <p className="publica-rotulo">Peso atual</p>
        {animal.pesoAtual ? (
          <>
            <p className="publica-peso-valor">{formatarPeso(animal.pesoAtual.pesoKg)}</p>
            <p className="publica-peso-arrobas">{formatarArrobas(animal.pesoAtual.arrobas)}</p>
            <p>Pesado em {formatarData(animal.pesoAtual.data)}</p>
          </>
        ) : (
          <p>Ainda sem pesagem registrada.</p>
        )}
      </section>

      <section>
        <dl className="publica-dados">
          <dt>Idade</dt>
          <dd>{formatarIdade(animal.dataNascimento)}</dd>
          <dt>Nascimento</dt>
          <dd>{formatarData(animal.dataNascimento)}</dd>
          <dt>Origem</dt>
          <dd>{formatarOrigem(animal.origem)}</dd>
          {animal.maeBrinco && (
            <>
              <dt>Mãe</dt>
              <dd>Brinco {formatarNumeroEtiqueta(animal.maeBrinco)}</dd>
            </>
          )}
        </dl>
      </section>

      <details className="publica-historico">
        <summary>Histórico de pesagens ({animal.pesagens.length})</summary>
        {animal.pesagens.length === 0 ? (
          <p>Nenhuma pesagem registrada.</p>
        ) : (
          <ul>
            {animal.pesagens.map((pesagem, indice) => (
              <li key={`${pesagem.data}-${indice}`}>
                <span>{formatarData(pesagem.data)}</span>
                <strong>{formatarPeso(pesagem.pesoKg)}</strong>
                {pesagem.gmdDesdeAnterior !== null && (
                  <span className="publica-gmd">
                    {pesagem.gmdDesdeAnterior >= 0 ? '+' : ''}
                    {pesagem.gmdDesdeAnterior.toLocaleString('pt-BR')} kg/dia
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>

      <details className="publica-historico">
        <summary>Vacinas e tratamentos ({animal.tratamentos.length})</summary>
        {animal.tratamentos.length === 0 ? (
          <p>Nenhum tratamento registrado.</p>
        ) : (
          <ul>
            {animal.tratamentos.map((tratamento, indice) => (
              <li key={`${tratamento.data}-${indice}`}>
                <span>{formatarData(tratamento.data)}</span>
                <strong>{tratamento.produto}</strong>
              </li>
            ))}
          </ul>
        )}
      </details>

      <p className="publica-rodape">Informações fornecidas por {fazenda.nome}.</p>
    </div>
  );
}
