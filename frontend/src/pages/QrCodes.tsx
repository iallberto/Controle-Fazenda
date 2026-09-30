import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { gerarLote, vincularCodigo, type Codigo } from '../api/codigos';
import { listarAnimais, type Animal } from '../api/animais';

export function QrCodes() {
  const [quantidade, setQuantidade] = useState('10');
  const [loteGerado, setLoteGerado] = useState<Codigo[]>([]);
  const [erroLote, setErroLote] = useState('');

  const [codigoParaVincular, setCodigoParaVincular] = useState('');
  const [animalId, setAnimalId] = useState('');
  const [mensagemVinculo, setMensagemVinculo] = useState('');
  const [erroVinculo, setErroVinculo] = useState('');
  const [animais, setAnimais] = useState<Animal[]>([]);

  useEffect(() => {
    listarAnimais().then(setAnimais);
  }, []);

  async function handleGerarLote(evento: FormEvent) {
    evento.preventDefault();
    setErroLote('');

    try {
      const codigos = await gerarLote(Number(quantidade));
      setLoteGerado(codigos);
    } catch {
      setErroLote('Não foi possível gerar o lote. Verifique a quantidade (máximo 150).');
    }
  }

  async function handleVincular(evento: FormEvent) {
    evento.preventDefault();
    setErroVinculo('');
    setMensagemVinculo('');

    try {
      await vincularCodigo(codigoParaVincular, animalId);
      setMensagemVinculo('Código vinculado com sucesso!');
      setCodigoParaVincular('');
      setAnimalId('');
    } catch {
      setErroVinculo('Não foi possível vincular. Verifique se o código está correto e disponível.');
    }
  }

  return (
    <div>
      <header>
        <h1>QR Codes</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <section>
        <h2>Gerar novo lote</h2>
        <form onSubmit={handleGerarLote}>
          <label htmlFor="quantidade">Quantidade</label>
          <input
            id="quantidade"
            type="number"
            min="1"
            max="150"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
          <button type="submit">Gerar</button>
          {erroLote && <p style={{ color: 'red' }}>{erroLote}</p>}
        </form>

        {loteGerado.length > 0 && (
          <>
            <p>
              {loteGerado.length} código(s) gerado(s). Anote-os para vincular aos animais no
              manejo:
            </p>
            <ul>
              {loteGerado.map((codigo) => (
                <li key={codigo.id}>{codigo.codigo}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2>Vincular código a um animal</h2>
        <form onSubmit={handleVincular}>
          <div>
            <label htmlFor="codigo">Código</label>
            <input
              id="codigo"
              value={codigoParaVincular}
              onChange={(e) => setCodigoParaVincular(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="animalVinculo">Animal</label>
            <select
              id="animalVinculo"
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              required
            >
              <option value="">Selecione o animal</option>
              {animais.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animal.brinco}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Vincular</button>
          {erroVinculo && <p style={{ color: 'red' }}>{erroVinculo}</p>}
          {mensagemVinculo && <p style={{ color: 'green' }}>{mensagemVinculo}</p>}
        </form>
      </section>
    </div>
  );
}