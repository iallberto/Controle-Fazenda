import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { criarParto, type Cria } from '../api/partos';
import { listarAnimais, type Animal } from '../api/animais';

export function NovoParto() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');

  const [maeId, setMaeId] = useState('');
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState<'NORMAL' | 'ASSISTIDO'>('NORMAL');
  const [resultado, setResultado] = useState<'VIVO' | 'NATIMORTO'>('VIVO');
  const [observacoes, setObservacoes] = useState('');
  const [crias, setCrias] = useState<Cria[]>([{ brinco: '', sexo: 'F' }]);

  const [matrizes, setMatrizes] = useState<Animal[]>([]);

  useEffect(() => {
    listarAnimais('MATRIZ').then(setMatrizes);
  }, []);

  function adicionarCria() {
    setCrias([...crias, { brinco: '', sexo: 'F' }]);
  }

  function removerCria(indice: number) {
    setCrias(crias.filter((_, i) => i !== indice));
  }

  function atualizarCria(indice: number, campo: keyof Cria, valor: string) {
    setCrias(
      crias.map((cria, i) => (i === indice ? { ...cria, [campo]: valor } : cria)),
    );
  }

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await criarParto({
        maeId,
        data,
        tipo,
        resultado,
        observacoes: observacoes || undefined,
        crias: resultado === 'VIVO' ? crias : undefined,
      });
      navigate('/animais');
    } catch {
      setErro('Não foi possível registrar o parto. Confira os dados.');
    }
  }

  return (
    <div>
      <header>
        <h1>Registrar parto</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="mae">Matriz</label>
          <select id="mae" value={maeId} onChange={(e) => setMaeId(e.target.value)} required>
            <option value="">Selecione a matriz</option>
            {matrizes.map((matriz) => (
              <option key={matriz.id} value={matriz.id}>
                {matriz.brinco}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="data">Data do parto</label>
          <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="NORMAL">Normal</option>
            <option value="ASSISTIDO">Assistido</option>
          </select>
        </div>

        <div>
          <label htmlFor="resultado">Resultado</label>
          <select
            id="resultado"
            value={resultado}
            onChange={(e) => setResultado(e.target.value as typeof resultado)}
          >
            <option value="VIVO">Vivo</option>
            <option value="NATIMORTO">Natimorto</option>
          </select>
        </div>

        <div>
          <label htmlFor="observacoes">Observações</label>
          <textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {resultado === 'VIVO' && (
          <fieldset>
            <legend>Crias</legend>
            {crias.map((cria, indice) => (
              <div key={indice}>
                <input
                  placeholder="Brinco"
                  value={cria.brinco}
                  onChange={(e) => atualizarCria(indice, 'brinco', e.target.value)}
                  required
                />
                <select
                  value={cria.sexo}
                  onChange={(e) => atualizarCria(indice, 'sexo', e.target.value)}
                >
                  <option value="F">Fêmea</option>
                  <option value="M">Macho</option>
                </select>
                {crias.length > 1 && (
                  <button type="button" onClick={() => removerCria(indice)}>
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={adicionarCria}>
              Adicionar outra cria
            </button>
          </fieldset>
        )}

        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button type="submit">Registrar parto</button>
      </form>
    </div>
  );
}