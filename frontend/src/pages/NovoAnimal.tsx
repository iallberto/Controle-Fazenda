import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { criarAnimal } from '../api/animais';
import { listarAnimais, type Animal } from '../api/animais';
import { listarRacas, type Raca } from '../api/racas';
import axios from 'axios';

export function NovoAnimal() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');

  const [brinco, setBrinco] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F'>('F');
  const [categoria, setCategoria] = useState<
  'BEZERRO' | 'NOVILHA' | 'MATRIZ' | 'GARROTE' | 'BOI' | 'TOURO' >('BEZERRO');
  const [origem, setOrigem] = useState<'NASCIDO_FAZENDA' | 'COMPRADO'>('NASCIDO_FAZENDA');
  const [dataNascimento, setDataNascimento] = useState('');
  const [racaId, setRacaId] = useState('');
  const [maeId, setMaeId] = useState('');
  const [dataCompra, setDataCompra] = useState('');
  const [procedencia, setProcedencia] = useState('');

  const [matrizes, setMatrizes] = useState<Animal[]>([]);
  const [racas, setRacas] = useState<Raca[]>([]);

  const opcoesCategoria =
  sexo === 'F'
    ? [
        { valor: 'NOVILHA', rotulo: 'Novilha' },
        { valor: 'MATRIZ', rotulo: 'Matriz' },
      ]
    : [
        { valor: 'BEZERRO', rotulo: 'Bezerro' },
        { valor: 'GARROTE', rotulo: 'Garrote' },
        { valor: 'BOI', rotulo: 'Boi' },
        { valor: 'TOURO', rotulo: 'Touro' },
      ];

  useEffect(() => {
    listarAnimais('MATRIZ').then(setMatrizes);
    listarRacas().then(setRacas);
  }, []);
  useEffect(() => {
  setCategoria(sexo === 'F' ? 'NOVILHA' : 'BEZERRO');
  }, [sexo]);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await criarAnimal({
        brinco,
        sexo,
        categoria,
        origem,
        dataNascimento,
        racaId: racaId || undefined,
        maeId: origem === 'NASCIDO_FAZENDA' ? maeId : undefined,
        dataCompra: origem === 'COMPRADO' ? dataCompra : undefined,
        procedencia: origem === 'COMPRADO' ? procedencia || undefined : undefined,
      });
      navigate('/animais');
    } catch (erroRequisicao) {
        const mensagem =
          axios.isAxiosError(erroRequisicao) && erroRequisicao.response?.data?.message ? erroRequisicao.response.data.message
          : 'Não foi possível cadastrar o animal. Confira os dados.';
          setErro(Array.isArray(mensagem) ? mensagem.join(', ') : mensagem);
    }
  }

  return (
    <div>
      <header>
        <h1>Novo animal</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="brinco">Brinco</label>
          <input id="brinco" value={brinco} onChange={(e) => setBrinco(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="sexo">Sexo</label>
          <select id="sexo" value={sexo} onChange={(e) => setSexo(e.target.value as 'M' | 'F')}>
            <option value="F">Fêmea</option>
            <option value="M">Macho</option>
          </select>
        </div>

        <div>
          <label htmlFor="categoria">Categoria</label>
          <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as typeof categoria)}>
            {opcoesCategoria.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="origem">Origem</label>
          <select
            id="origem"
            value={origem}
            onChange={(e) => setOrigem(e.target.value as typeof origem)}
          >
            <option value="NASCIDO_FAZENDA">Nascido na fazenda</option>
            <option value="COMPRADO">Comprado</option>
          </select>
        </div>

        <div>
          <label htmlFor="dataNascimento">Data de nascimento</label>
          <input
            id="dataNascimento"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="raca">Raça</label>
          <select id="raca" value={racaId} onChange={(e) => setRacaId(e.target.value)}>
            <option value="">Não definida</option>
            {racas.map((raca) => (
              <option key={raca.id} value={raca.id}>
                {raca.nome}
              </option>
            ))}
          </select>
        </div>

        {origem === 'NASCIDO_FAZENDA' && (
          <div>
            <label htmlFor="mae">Mãe</label>
            <select id="mae" value={maeId} onChange={(e) => setMaeId(e.target.value)} required>
              <option value="">Selecione a matriz</option>
              {matrizes.map((matriz) => (
                <option key={matriz.id} value={matriz.id}>
                  {matriz.brinco}
                </option>
              ))}
            </select>
          </div>
        )}

        {origem === 'COMPRADO' && (
          <>
            <div>
              <label htmlFor="dataCompra">Data da compra</label>
              <input
                id="dataCompra"
                type="date"
                value={dataCompra}
                onChange={(e) => setDataCompra(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="procedencia">Procedência</label>
              <input
                id="procedencia"
                value={procedencia}
                onChange={(e) => setProcedencia(e.target.value)}
              />
            </div>
          </>
        )}

        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
}