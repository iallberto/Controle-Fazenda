import { useState, type FormEvent } from 'react';
import { mensagemDeErro } from '../../api/client';
import { Aviso, type EstadoAviso } from '../../components/Aviso';
import { centavosDeTexto, formatarData, formatarDataHora, formatarReais } from '../../utils/formatadores';
import { hojeLocal } from '../../utils/datas';
import {
  confirmarPagamento,
  estenderPrazo,
  liberarTeste,
  salvarTelefone,
  tornarSemPrazo,
  type ModuloPago,
  type PrazoDaFazenda,
} from './api';

const MODULOS: { modulo: ModuloPago; rotulo: string }[] = [
  { modulo: 'LEITE', rotulo: 'Leite' },
  { modulo: 'FINANCEIRO', rotulo: 'Financeiro' },
  { modulo: 'NUTRICAO', rotulo: 'Nutrição' },
];

const SITUACAO: Record<PrazoDaFazenda['situacao'], string> = {
  SEM_PRAZO: 'Cliente sem prazo',
  AGUARDANDO_IMPLANTACAO: 'Aguardando implantação (só consulta; o suporte lança)',
  EM_DIA: 'Em dia',
  CARENCIA: 'Em carência (ainda lança)',
  VENCIDO: 'Vencida (só consulta)',
};

const TIPO: Record<string, string> = {
  TESTE: 'Teste de 30 dias',
  PAGAMENTO: 'Pagamento',
  EXTENSAO: 'Extensão',
  SEM_PRAZO: 'Cliente sem prazo',
};

// Prazo de acesso no detalhe da fazenda (spec 008, US3): liberar o teste depois
// da implantação, confirmar o Pix, estender, tornar sem prazo e o telefone.
export function PrazoDaFazendaSecao({
  fazendaId,
  prazo,
  aoMudar,
}: {
  fazendaId: string;
  prazo: PrazoDaFazenda;
  aoMudar: () => void;
}) {
  const [modulos, setModulos] = useState<ModuloPago[]>([]);
  const [valor, setValor] = useState('');
  const [novaData, setNovaData] = useState('');
  const [telefone, setTelefone] = useState(prazo.telefoneContato ?? '');
  const [aviso, setAviso] = useState<EstadoAviso>(null);
  const [enviando, setEnviando] = useState(false);

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setAviso(null);
    setEnviando(true);
    try {
      await acao();
      setAviso({ tipo: 'sucesso', texto: sucesso });
      aoMudar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: mensagemDeErro(e) });
    } finally {
      setEnviando(false);
    }
  }

  function liberar(evento: FormEvent) {
    evento.preventDefault();
    const nomes = modulos.length ? modulos.map((m) => MODULOS.find((x) => x.modulo === m)?.rotulo).join(', ') : 'nenhum módulo';
    if (!window.confirm(`Liberar o teste de 30 dias com o pacote inicial e ${nomes}? A contagem começa hoje.`)) return;
    void executar(() => liberarTeste(fazendaId, modulos), 'Teste de 30 dias liberado.');
  }

  function pagar(evento: FormEvent) {
    evento.preventDefault();
    const centavos = valor.trim() ? centavosDeTexto(valor) : undefined;
    if (centavos === null) {
      setAviso({ tipo: 'erro', texto: 'Valor inválido' });
      return;
    }
    const texto = formatarReais(centavos ?? prazo.valorCentavos);
    if (!window.confirm(`Confirmar o pagamento de ${texto}? Libera mais 30 dias.`)) return;
    void executar(() => confirmarPagamento(fazendaId, centavos), `Pagamento de ${texto} confirmado: mais 30 dias.`);
    setValor('');
  }

  const temPrazo = !prazo.semPrazo && prazo.acessoAte;

  return (
    <section>
      <h2>Prazo de acesso</h2>
      {aviso && (
        <Aviso tipo={aviso.tipo} aoFechar={() => setAviso(null)}>
          {aviso.texto}
        </Aviso>
      )}
      <p>
        <strong>{SITUACAO[prazo.situacao]}</strong>
        {prazo.acessoAte && !prazo.semPrazo && ` · até ${formatarData(prazo.acessoAte)}`}
        {prazo.modulosPlano.length > 0 &&
          ` · plano: pacote inicial + ${prazo.modulosPlano.map((m) => MODULOS.find((x) => x.modulo === m)?.rotulo).join(', ')}`}
        {!prazo.semPrazo && ` · ${formatarReais(prazo.valorCentavos)} a cada 30 dias`}
      </p>

      {prazo.situacao === 'AGUARDANDO_IMPLANTACAO' && (
        <form onSubmit={liberar}>
          <p className="dica">Depois de cadastrar o rebanho, libere o teste. Marque os módulos que entram:</p>
          {MODULOS.map(({ modulo, rotulo }) => (
            <label key={modulo} className="campo-checkbox">
              <input
                type="checkbox"
                checked={modulos.includes(modulo)}
                onChange={(e) =>
                  setModulos(e.target.checked ? [...modulos, modulo] : modulos.filter((m) => m !== modulo))
                }
              />{' '}
              {rotulo}
            </label>
          ))}
          <button type="submit" disabled={enviando}>
            Liberar teste de 30 dias
          </button>
        </form>
      )}

      {temPrazo && (
        <form onSubmit={pagar}>
          <label htmlFor="valor-pagamento">Valor recebido (vazio = {formatarReais(prazo.valorCentavos)})</label>
          <input id="valor-pagamento" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          <button type="submit" disabled={enviando}>
            Confirmar pagamento (+30 dias)
          </button>
        </form>
      )}

      {temPrazo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void executar(() => estenderPrazo(fazendaId, novaData), `Prazo estendido até ${formatarData(novaData)}.`);
          }}
        >
          <label htmlFor="nova-data">Estender o prazo até</label>
          <input id="nova-data" type="date" min={hojeLocal()} value={novaData} onChange={(e) => setNovaData(e.target.value)} required />
          <button type="submit" className="botao-secundario" disabled={enviando}>
            Estender
          </button>
        </form>
      )}

      {!prazo.semPrazo && (
        <button
          type="button"
          className="botao-secundario"
          disabled={enviando}
          onClick={() => {
            if (!window.confirm('Tornar cliente sem prazo? A fazenda deixa de vencer.')) return;
            void executar(() => tornarSemPrazo(fazendaId), 'Agora é cliente sem prazo.');
          }}
        >
          Cliente sem prazo
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void executar(() => salvarTelefone(fazendaId, telefone), 'Telefone salvo.');
        }}
      >
        <label htmlFor="telefone-contato">Telefone de contato (para cobrança)</label>
        <input id="telefone-contato" inputMode="tel" maxLength={30} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <button type="submit" className="botao-secundario" disabled={enviando}>
          Salvar telefone
        </button>
      </form>

      {prazo.registros.length > 0 && (
        <ul>
          {prazo.registros.map((r) => (
            <li key={r.id}>
              {TIPO[r.tipo]} em {formatarDataHora(r.criadoEm)} por {r.administrador ?? '—'}
              {r.ate && ` · até ${formatarData(r.ate)}`}
              {r.valorCentavos !== null && ` · ${formatarReais(r.valorCentavos)}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
