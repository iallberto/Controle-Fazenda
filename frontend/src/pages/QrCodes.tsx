import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { gerarLote, listarDisponiveis, type Codigo } from '../api/codigos';

export function QrCodes() {
  const [codigosDisponiveis, setCodigosDisponiveis] = useState<Codigo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [quantidade, setQuantidade] = useState('10');
  const [erro, setErro] = useState('');

  function carregar() {
    listarDisponiveis().then((codigos) => {
      setCodigosDisponiveis(codigos);
      setCarregando(false);
    });
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleGerarLote(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await gerarLote(Number(quantidade));
      carregar();
    } catch {
      setErro('Não foi possível gerar o lote. Verifique a quantidade (máximo 150).');
    }
  }

  return (
    <div>
      <header className="nao-imprimir">
        <h1>QR Codes</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      {!carregando && (
        <p className="nao-imprimir">
          Você possui <strong>{codigosDisponiveis.length}</strong> código(s) disponível(is).
        </p>
      )}

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
        <button type="submit">Gerar</button>
        {erro && <p style={{ color: 'red' }}>{erro}</p>}
      </form>

      {codigosDisponiveis.length > 0 && (
        <section>
          <div className="nao-imprimir" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h2>Códigos disponíveis para impressão</h2>
            <button type="button" onClick={() => window.print()}>
              Imprimir
            </button>
          </div>
          <ul>
            {codigosDisponiveis.map((codigo) => (
              <li key={codigo.id}>#{String(codigo.numero).padStart(4, '0')}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}