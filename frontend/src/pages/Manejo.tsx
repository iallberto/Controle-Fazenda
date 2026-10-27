import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { atualizarAnimal, type Animal } from '../api/animais';
import { buscarPorNumero } from '../api/codigos';
import { criarPesagem } from '../api/pesagens';
import { criarTratamento } from '../api/tratamentos';
import { moverAnimal } from '../api/movimentacoes';
import { listarPastos, type Pasto } from '../api/pastos';
import { useAuth } from '../contexts/useAuth';
import { formatarBrinco } from '../utils/formatarBrinco';
import { formatarSexo } from '../utils/formatadores';

function extrairMensagem(erro: unknown, padrao: string) {
  const mensagem =
    axios.isAxiosError(erro) && erro.response?.data?.message ? erro.response.data.message : padrao;
  return Array.isArray(mensagem) ? mensagem.join(', ') : mensagem;
}

export function Manejo() {
  const { usuario } = useAuth();
  const [brinco, setBrinco] = useState('');
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [erroBusca, setErroBusca] = useState('');
  const [avisoReemissao, setAvisoReemissao] = useState('');
  const [pastos, setPastos] = useState<Pasto[]>([]);

  const [editandoCategoria, setEditandoCategoria] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [mensagemCategoria, setMensagemCategoria] = useState('');

  const [mostrarPeso, setMostrarPeso] = useState(false);
  const [pesoKg, setPesoKg] = useState('');
  const [dataPeso, setDataPeso] = useState('');
  const [mensagemPeso, setMensagemPeso] = useState('');

  const [mostrarTratamento, setMostrarTratamento] = useState(false);
  const [produto, setProduto] = useState('');
  const [dataTratamento, setDataTratamento] = useState('');
  const [mensagemTratamento, setMensagemTratamento] = useState('');

  const [mostrarPasto, setMostrarPasto] = useState(false);
  const [pastoId, setPastoId] = useState('');
  const [mensagemPasto, setMensagemPasto] = useState('');

  useEffect(() => {
    listarPastos().then(setPastos);
  }, []);

  async function handleBuscar(evento: FormEvent) {
    evento.preventDefault();
    setErroBusca('');
    setAvisoReemissao('');
    setAnimal(null);

    try {
      const resultado = await buscarPorNumero(brinco);
      setAnimal(resultado.animal);
      setNovaCategoria(resultado.animal.categoria);
      setAvisoReemissao(resultado.aviso ?? '');
    } catch (erro) {
      setErroBusca(extrairMensagem(erro, 'Animal não encontrado.'));
    }
  }

  async function handleSalvarCategoria() {
    if (!animal) return;
    setMensagemCategoria('');
    try {
      const atualizado = await atualizarAnimal(animal.id, { categoria: novaCategoria as Animal['categoria'] });
      setAnimal(atualizado);
      setEditandoCategoria(false);
      setMensagemCategoria('Categoria atualizada.');
    } catch (erro) {
      setMensagemCategoria(extrairMensagem(erro, 'Não foi possível atualizar a categoria.'));
    }
  }

  async function handleRegistrarPeso(evento: FormEvent) {
    evento.preventDefault();
    if (!animal) return;
    setMensagemPeso('');
    try {
      await criarPesagem({ animalId: animal.id, pesoKg: Number(pesoKg), data: dataPeso });
      setMensagemPeso('Peso registrado.');
      setMostrarPeso(false);
      setPesoKg('');
      setDataPeso('');
    } catch (erro) {
      setMensagemPeso(extrairMensagem(erro, 'Não foi possível registrar o peso.'));
    }
  }

  async function handleRegistrarTratamento(evento: FormEvent) {
    evento.preventDefault();
    if (!animal || !usuario) return;
    setMensagemTratamento('');
    try {
      await criarTratamento({
        animalId: animal.id,
        produto,
        data: dataTratamento,
        aplicadoPorTipo: 'USUARIO',
        aplicadoPorUsuarioId: usuario.id,
      });
      setMensagemTratamento('Tratamento registrado.');
      setMostrarTratamento(false);
      setProduto('');
      setDataTratamento('');
    } catch (erro) {
      setMensagemTratamento(extrairMensagem(erro, 'Não foi possível registrar o tratamento.'));
    }
  }

  async function handleMoverPasto(evento: FormEvent) {
    evento.preventDefault();
    if (!animal) return;
    setMensagemPasto('');
    try {
      await moverAnimal({ animalId: animal.id, pastoId });
      setMensagemPasto('Animal movido de pasto.');
      setMostrarPasto(false);
      setPastoId('');
    } catch (erro) {
      setMensagemPasto(extrairMensagem(erro, 'Não foi possível mover o animal.'));
    }
  }

  return (
    <div>
      <header>
        <h1>Manejo</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <form onSubmit={handleBuscar}>
        <label htmlFor="brinco">Brinco</label>
        <input id="brinco" value={brinco} onChange={(e) => setBrinco(e.target.value)} required />
        <button type="submit">Buscar</button>
        {erroBusca && <p style={{ color: 'red' }}>{erroBusca}</p>}
      </form>

      {animal && (
        <>
          {avisoReemissao && (
            <p
              role="status"
              style={{ background: '#fff3cd', padding: '0.5rem', borderRadius: '4px' }}
            >
              {avisoReemissao}
            </p>
          )}

          <section>
            <h2>Brinco {formatarBrinco(animal.brinco)}</h2>
            <p>Sexo: {formatarSexo(animal.sexo)}</p>
            <p>
              Categoria: {editandoCategoria ? (
                <>
                  <select value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)}>
                    <option value="BEZERRO">Bezerro</option>
                    <option value="NOVILHA">Novilha</option>
                    <option value="MATRIZ">Matriz</option>
                    <option value="GARROTE">Garrote</option>
                    <option value="BOI">Boi</option>
                    <option value="TOURO">Touro</option>
                  </select>
                  <button type="button" onClick={handleSalvarCategoria}>Salvar</button>
                  <button type="button" onClick={() => setEditandoCategoria(false)}>Cancelar</button>
                </>
              ) : (
                <>
                  {animal.categoria}{' '}
                  <button type="button" onClick={() => setEditandoCategoria(true)}>Editar</button>
                </>
              )}
            </p>
            {mensagemCategoria && <p>{mensagemCategoria}</p>}
          </section>

          <section>
            <h2>Peso</h2>
            {!mostrarPeso && <button type="button" onClick={() => setMostrarPeso(true)}>Registrar peso</button>}
            {mostrarPeso && (
              <form onSubmit={handleRegistrarPeso}>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Peso (kg)"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                  required
                />
                <input
                  type="date"
                  value={dataPeso}
                  onChange={(e) => setDataPeso(e.target.value)}
                  required
                />
                <button type="submit">Salvar</button>
                <button type="button" onClick={() => setMostrarPeso(false)}>Cancelar</button>
              </form>
            )}
            {mensagemPeso && <p>{mensagemPeso}</p>}
          </section>

          <section>
            <h2>Tratamento</h2>
            {!mostrarTratamento && (
              <button type="button" onClick={() => setMostrarTratamento(true)}>Registrar tratamento</button>
            )}
            {mostrarTratamento && (
              <form onSubmit={handleRegistrarTratamento}>
                <input
                  placeholder="Produto"
                  value={produto}
                  onChange={(e) => setProduto(e.target.value)}
                  required
                />
                <input
                  type="date"
                  value={dataTratamento}
                  onChange={(e) => setDataTratamento(e.target.value)}
                  required
                />
                <button type="submit">Salvar</button>
                <button type="button" onClick={() => setMostrarTratamento(false)}>Cancelar</button>
              </form>
            )}
            {mensagemTratamento && <p>{mensagemTratamento}</p>}
          </section>

          <section>
            <h2>Pasto</h2>
            {!mostrarPasto && <button type="button" onClick={() => setMostrarPasto(true)}>Mudar de pasto</button>}
            {mostrarPasto && (
              <form onSubmit={handleMoverPasto}>
                <select value={pastoId} onChange={(e) => setPastoId(e.target.value)} required>
                  <option value="">Selecione o pasto</option>
                  {pastos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <button type="submit">Salvar</button>
                <button type="button" onClick={() => setMostrarPasto(false)}>Cancelar</button>
              </form>
            )}
            {mensagemPasto && <p>{mensagemPasto}</p>}
          </section>

          <Link to={`/animais/${animal.id}`}>Ver histórico completo</Link>
        </>
      )}
    </div>
  );
}