import { useCallback, useEffect, useState } from 'react';
import { buscarSituacaoReprodutiva, registrarDiagnostico, type SituacaoReprodutiva } from '../../api/reproducao';
import { mensagemDeErro } from '../../api/client';
import { useAuth } from '../../contexts/useAuth';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import {
  formatarBasePrevisao,
  formatarBrinco,
  formatarData,
  formatarIdadeGestacional,
  formatarResultadoDiagnostico,
  formatarStatusReprodutivo,
  idadeGestacionalEmDias,
} from '../../utils/formatadores';

// FR-027: no Manejo, a situação reprodutiva da fêmea e o diagnóstico rápido
// (toque, feito por quem está logado), sem sair da tela do brete.
export function BlocoReproducao({ animalId }: { animalId: string }) {
  const { usuario } = useAuth();
  const [situacao, setSituacao] = useState<SituacaoReprodutiva | null>(null);
  const [resultado, setResultado] = useState<'PRENHE' | 'VAZIA' | null>(null);
  const [meses, setMeses] = useState('');
  const [dias, setDias] = useState('');
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => {
    buscarSituacaoReprodutiva(animalId)
      .then(setSituacao)
      .catch(() => setSituacao(null));
  }, [animalId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!situacao?.aplicavel) return null;

  async function handleSalvar() {
    if (!resultado || !usuario) return;
    setAviso(null);
    setEnviando(true);
    const idade = idadeGestacionalEmDias(Number(meses) || 0, Number(dias) || 0);
    try {
      await registrarDiagnostico({
        femeaId: animalId,
        data: hojeLocal(),
        resultado,
        metodo: 'TOQUE',
        idadeGestacionalDias: resultado === 'PRENHE' && idade > 0 ? idade : undefined,
        feitoPorTipo: 'USUARIO',
        feitoPorUsuarioId: usuario.id,
      });
      setAviso({
        tipo: 'sucesso',
        texto:
          resultado === 'PRENHE'
            ? `Diagnóstico registrado: prenhe${idade > 0 ? ` de ${formatarIdadeGestacional(idade)}` : ''}.`
            : 'Diagnóstico registrado: vazia.',
      });
      setResultado(null);
      setMeses('');
      setDias('');
      carregar();
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(erro, 'Não foi possível registrar o diagnóstico.') });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <h2>Reprodução</h2>
      <p>
        <strong>{formatarStatusReprodutivo(situacao.statusReprodutivo) || 'Sem diagnóstico'}</strong>
        {situacao.previsaoParto && (
          <>
            {' · '}parto previsto em {formatarData(situacao.previsaoParto.data)} (
            {formatarBasePrevisao(situacao.previsaoParto.base)})
          </>
        )}
      </p>
      {situacao.expostaA?.map((exposicao) => (
        <p key={exposicao.estacaoId}>
          Com o touro {exposicao.touroBrinco && formatarBrinco(exposicao.touroBrinco)} no{' '}
          {exposicao.pasto} desde {formatarData(exposicao.desde)}
        </p>
      ))}
      {situacao.inseminacaoPendente && (
        <p>
          Inseminada ({situacao.inseminacaoPendente.tipo}) em {formatarData(situacao.inseminacaoPendente.data)}
          {situacao.inseminacaoPendente.semen && `, sêmen ${situacao.inseminacaoPendente.semen}`}
        </p>
      )}
      {situacao.ultimoDiagnostico && (
        <p>
          Último diagnóstico: {formatarResultadoDiagnostico(situacao.ultimoDiagnostico.resultado)} em{' '}
          {formatarData(situacao.ultimoDiagnostico.data)}
          {situacao.ultimoDiagnostico.idadeGestacionalDias &&
            ` (${formatarIdadeGestacional(situacao.ultimoDiagnostico.idadeGestacionalDias)})`}
        </p>
      )}
      {situacao.aptaEm && <p>Apta para cobertura a partir de {formatarData(situacao.aptaEm)}.</p>}

      <div className="botoes-resultado">
        <span>Diagnóstico de hoje (toque):</span>
        <button
          type="button"
          className={resultado === 'PRENHE' ? 'resultado ativo-prenhe' : 'resultado'}
          aria-pressed={resultado === 'PRENHE'}
          onClick={() => setResultado(resultado === 'PRENHE' ? null : 'PRENHE')}
        >
          Prenhe
        </button>
        <button
          type="button"
          className={resultado === 'VAZIA' ? 'resultado ativo-vazia' : 'resultado'}
          aria-pressed={resultado === 'VAZIA'}
          onClick={() => setResultado(resultado === 'VAZIA' ? null : 'VAZIA')}
        >
          Vazia
        </button>
      </div>
      {resultado === 'PRENHE' && (
        <div className="idade-gestacional">
          <span>Idade da prenhez (opcional):</span>
          <input
            aria-label="Meses de prenhez"
            type="number"
            min={0}
            max={10}
            inputMode="numeric"
            placeholder="meses"
            value={meses}
            onChange={(e) => setMeses(e.target.value)}
          />
          <span>meses e</span>
          <input
            aria-label="Dias de prenhez"
            type="number"
            min={0}
            max={29}
            inputMode="numeric"
            placeholder="dias"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
          />
          <span>dias</span>
        </div>
      )}
      {resultado && (
        <button type="button" onClick={handleSalvar} disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar diagnóstico'}
        </button>
      )}
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
    </section>
  );
}
