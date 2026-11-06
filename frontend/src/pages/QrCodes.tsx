import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  baixarEtiquetas,
  gerarLote,
  listarCodigos,
  mensagemDeBlob,
  type Codigo,
  type FiltroCodigos,
} from '../api/codigos';
import { formatarBrinco, formatarStatusCodigo } from '../utils/formatadores';
import { Aviso } from '../components/Aviso';
import { useAuth } from '../contexts/useAuth';

const POR_PAGINA = 30;

function extrairMensagem(erro: unknown, padrao: string) {
  const mensagem =
    axios.isAxiosError(erro) && erro.response?.data?.message ? erro.response.data.message : padrao;
  return Array.isArray(mensagem) ? mensagem.join(', ') : mensagem;
}

export function QrCodes() {
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState('');
  const [pagina, setPagina] = useState(1);

  const [status, setStatus] = useState<'' | Codigo['status']>('DISPONIVEL');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [filtroAplicado, setFiltroAplicado] = useState<FiltroCodigos>({ status: 'DISPONIVEL' });

  const [quantidade, setQuantidade] = useState('10');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  // PDF das etiquetas com QR, só o dono (inclui o suporte) (spec 008, US2)
  const { usuario } = useAuth();
  const ehDono = usuario?.papel === 'DONO';
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [avisoPdf, setAvisoPdf] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  /*function carregar(filtro: FiltroCodigos) {
    setCarregando(true);
    setErroLista('');
    setPagina(1);
    listarCodigos(filtro)
      .then(setCodigos)
      .catch((e) => setErroLista(extrairMensagem(e, 'Não foi possível carregar os códigos.')))
      .finally(() => setCarregando(false));
  }*/

  useEffect(() => {
    let cancelado = false;

    listarCodigos(filtroAplicado)
      .then((dados) => {
        if (cancelado) return;
        setCodigos(dados);
        setErroLista('');
        setPagina(1);
      })
      .catch((e) => {
        if (cancelado) return;
        setErroLista(extrairMensagem(e, 'Não foi possível carregar os códigos.'));
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [filtroAplicado]);

  function handleFiltrar(evento: FormEvent) {
    evento.preventDefault();
    setErroLista('');
    setSucesso('');

    if (de && ate && Number(de) > Number(ate)) {
      setErroLista('A faixa inicial não pode ser maior que a final.');
      return;
    }
    setCarregando(true);
    setFiltroAplicado({
      status: status || undefined,
      de: de ? Number(de) : undefined,
      ate: ate ? Number(ate) : undefined,
    });
  }

  function handleLimpar() {
    setStatus('DISPONIVEL');
    setDe('');
    setAte('');
    setErroLista('');
    setSucesso('');
    setCarregando(true);
    setFiltroAplicado({ status: 'DISPONIVEL' });
  }

  async function handleGerarLote(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setSucesso('');
    setGerando(true);

    try {
      const gerados = await gerarLote(Number(quantidade));
      if (gerados.length > 0) {
        const numeros = gerados.map((codigo) => codigo.numero);
        const primeiro = Math.min(...numeros);
        const ultimo = Math.max(...numeros);

        setSucesso(
          `${gerados.length} código(s) gerado(s): ${formatarBrinco(primeiro)} a ${formatarBrinco(ultimo)}.`,
        );
        setStatus('DISPONIVEL');
        setDe(String(primeiro));
        setAte(String(ultimo));
        setCarregando(true);
        setFiltroAplicado({ status: 'DISPONIVEL', de: primeiro, ate: ultimo });
      }
    } catch (e) {
      setErro(
        extrairMensagem(e, 'Não foi possível gerar o lote. Verifique a quantidade (máximo 150).'),
      );
    } finally {
      setGerando(false);
    }
  }

  async function handleEtiquetas() {
    setAvisoPdf(null);
    if (codigos.length > 500) {
      setAvisoPdf({ tipo: 'erro', texto: 'No máximo 500 etiquetas por arquivo: filtre uma faixa menor.' });
      return;
    }
    setGerandoPdf(true);
    try {
      await baixarEtiquetas(codigos.map((c) => c.id));
      const folhas = Math.ceil(codigos.length / 24);
      setAvisoPdf({
        tipo: 'sucesso',
        texto: `PDF com ${codigos.length} etiqueta(s) em ${folhas} folha(s) A4 baixado. Envie à gráfica.`,
      });
    } catch (e) {
      setAvisoPdf({ tipo: 'erro', texto: await mensagemDeBlob(e, 'Não foi possível gerar as etiquetas.') });
    } finally {
      setGerandoPdf(false);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(codigos.length / POR_PAGINA));
  const inicio = (pagina - 1) * POR_PAGINA;
  const codigosDaPagina = codigos.slice(inicio, inicio + POR_PAGINA);

  return (
    <div>
      <header className="nao-imprimir">
        <h1>QR Codes</h1>
      </header>

      <p className="nao-imprimir">
        Os códigos <strong>disponíveis</strong> são escolhidos no cadastro de cada animal novo.
        Se um animal perdeu o brinco, reemita o código na página dele, em vez de usar um
        código daqui. Imprima as etiquetas em material resistente ao sol e à chuva.
      </p>

      <form onSubmit={handleGerarLote} className="nao-imprimir">
        <label htmlFor="quantidade">Gerar mais códigos</label>
        <input
          id="quantidade"
          type="number"
          min="1"
          max="150"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
        <button type="submit" disabled={gerando}>
          {gerando ? 'Gerando...' : 'Gerar'}
        </button>
        {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
      </form>

      <form onSubmit={handleFiltrar} className="nao-imprimir">
        <h2>Filtrar códigos</h2>
        <label htmlFor="status">Situação</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | Codigo['status'])}
        >
          <option value="">Todos</option>
          <option value="DISPONIVEL">Disponíveis</option>
          <option value="VINCULADO">Vinculados</option>
          <option value="DESATIVADO">Desativados</option>
        </select>

        <label htmlFor="de">Do número</label>
        <input
          id="de"
          type="number"
          min="1"
          value={de}
          onChange={(e) => setDe(e.target.value)}
        />

        <label htmlFor="ate">Até o número</label>
        <input
          id="ate"
          type="number"
          min="1"
          value={ate}
          onChange={(e) => setAte(e.target.value)}
        />

        <button type="submit">Filtrar</button>
        <button type="button" onClick={handleLimpar}>
          Limpar
        </button>
        {erroLista && <Aviso tipo="erro">{erroLista}</Aviso>}
      </form>

      {!carregando && !erroLista && codigos.length === 0 && (
        <p className="nao-imprimir">
          Nenhum código encontrado. Ajuste o filtro ou gere um novo lote acima.
        </p>
      )}

      {codigos.length > 0 && (
        <section>
          <div className="nao-imprimir" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h2>Códigos para conferência e impressão</h2>
            <span>
              {ehDono && (
                <button type="button" onClick={handleEtiquetas} disabled={gerandoPdf}>
                  {gerandoPdf ? 'Gerando PDF…' : `Etiquetas para a gráfica (PDF, ${codigos.length})`}
                </button>
              )}{' '}
              <button type="button" className="botao-secundario" onClick={() => window.print()}>
                Imprimir lista
              </button>
            </span>
          </div>
          {avisoPdf && (
            <Aviso tipo={avisoPdf.tipo} aoFechar={() => setAvisoPdf(null)}>
              {avisoPdf.texto}
            </Aviso>
          )}
          {ehDono && (
            <p className="dica nao-imprimir">
              O PDF sai em folhas A4 com 24 etiquetas de 57 × 32 mm, QR e marcas de corte: a gráfica
              imprime no adesivo e corta.
            </p>
          )}

          <p className="nao-imprimir">
            Mostrando {inicio + 1} a {inicio + codigosDaPagina.length} de{' '}
            <strong>{codigos.length}</strong> código(s) neste filtro.
          </p>

          <ul className="nao-imprimir">
            {codigosDaPagina.map((codigo) => (
              <li key={codigo.id}>
                {formatarBrinco(codigo.numero)} — {formatarStatusCodigo(codigo.status)}
                {codigo.status === 'VINCULADO' && codigo.animal && (
                  <>
                    {' '}(animal{' '}
                    <Link to={`/animais/${codigo.animal.id}`}>
                      {formatarBrinco(codigo.animal.brinco)}
                    </Link>
                    ) —{' '}
                    {/* Prévia do que aparece para quem escanear a etiqueta */}
                    <a href={`/a/${codigo.codigo}`} target="_blank" rel="noreferrer">
                      Ver página pública
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>

          <nav className="nao-imprimir" aria-label="Paginação dos códigos">
            <button type="button" onClick={() => setPagina(1)} disabled={pagina === 1}>
              Primeira
            </button>
            <button
              type="button"
              onClick={() => setPagina((p) => p - 1)}
              disabled={pagina === 1}
            >
              Anterior
            </button>
            <span>
              {' '}Página {pagina} de {totalPaginas}{' '}
            </span>
            <button
              type="button"
              onClick={() => setPagina((p) => p + 1)}
              disabled={pagina === totalPaginas}
            >
              Próxima
            </button>
            <button
              type="button"
              onClick={() => setPagina(totalPaginas)}
              disabled={pagina === totalPaginas}
            >
              Última
            </button>
          </nav>

          <ul className="so-imprimir">
            {codigos.map((codigo) => (
              <li key={codigo.id}>{formatarBrinco(codigo.numero)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}