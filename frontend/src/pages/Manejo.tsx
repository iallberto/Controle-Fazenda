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
import {
  CATEGORIAS_POR_SEXO,
  ROTULOS_CATEGORIA,
  formatarBrinco,
  formatarCategoria,
  formatarData,
  formatarPeso,
  formatarSexo,
} from '../utils/formatadores';
import { Aviso, type EstadoAviso } from '../components/Aviso';

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
  const [avisoCategoria, setAvisoCategoria] = useState<EstadoAviso>(null);

  const [mostrarPeso, setMostrarPeso] = useState(false);
  const [pesoKg, setPesoKg] = useState('');
  const [dataPeso, setDataPeso] = useState('');
  const [avisoPeso, setAvisoPeso] = useState<EstadoAviso>(null);

  const [mostrarTratamento, setMostrarTratamento] = useState(false);
  const [produto, setProduto] = useState('');
  const [dataTratamento, setDataTratamento] = useState('');
  const [avisoTratamento, setAvisoTratamento] = useState<EstadoAviso>(null);

  const [mostrarPasto, setMostrarPasto] = useState(false);
  const [pastoId, setPastoId] = useState('');
  const [avisoPasto, setAvisoPasto] = useState<EstadoAviso>(null);

  useEffect(() => {
    listarPastos().then(setPastos);
  }, []);

  async function handleBuscar(evento: FormEvent) {
    evento.preventDefault();
    setErroBusca('');
    setAvisoReemissao('');
    setAnimal(null);
    setAvisoCategoria(null);
    setAvisoPeso(null);
    setAvisoTratamento(null);
    setAvisoPasto(null);

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
    setAvisoCategoria(null);
    try {
      const atualizado = await atualizarAnimal(animal.id, { categoria: novaCategoria as Animal['categoria'] });
      setAnimal(atualizado);
      setEditandoCategoria(false);
      setAvisoCategoria({
        tipo: 'sucesso',
        texto: `Categoria alterada para ${formatarCategoria(atualizado.categoria)}.`,
      });
    } catch (erro) {
      setAvisoCategoria({
        tipo: 'erro',
        texto: extrairMensagem(erro, 'Não foi possível atualizar a categoria.'),
      });
    }
  }

  async function handleRegistrarPeso(evento: FormEvent) {
    evento.preventDefault();
    if (!animal) return;
    setAvisoPeso(null);
    try {
      await criarPesagem({ animalId: animal.id, pesoKg: Number(pesoKg), data: dataPeso });
      setAvisoPeso({
        tipo: 'sucesso',
        texto: `Peso de ${formatarPeso(pesoKg)} registrado em ${formatarData(dataPeso)}.`,
      });
      setMostrarPeso(false);
      setPesoKg('');
      setDataPeso('');
    } catch (erro) {
      setAvisoPeso({ tipo: 'erro', texto: extrairMensagem(erro, 'Não foi possível registrar o peso.') });
    }
  }

  async function handleRegistrarTratamento(evento: FormEvent) {
    evento.preventDefault();
    if (!animal || !usuario) return;
    setAvisoTratamento(null);
    try {
      await criarTratamento({
        animalId: animal.id,
        produto,
        data: dataTratamento,
        aplicadoPorTipo: 'USUARIO',
        aplicadoPorUsuarioId: usuario.id,
      });
      setAvisoTratamento({ tipo: 'sucesso', texto: `Tratamento "${produto}" registrado.` });
      setMostrarTratamento(false);
      setProduto('');
      setDataTratamento('');
    } catch (erro) {
      setAvisoTratamento({
        tipo: 'erro',
        texto: extrairMensagem(erro, 'Não foi possível registrar o tratamento.'),
      });
    }
  }

  async function handleMoverPasto(evento: FormEvent) {
    evento.preventDefault();
    if (!animal) return;
    setAvisoPasto(null);
    try {
      await moverAnimal({ animalId: animal.id, pastoId });
      const destino = pastos.find((pasto) => pasto.id === pastoId)?.nome;
      setAvisoPasto({
        tipo: 'sucesso',
        texto: destino ? `Animal movido para ${destino}.` : 'Animal movido de pasto.',
      });
      setMostrarPasto(false);
      setPastoId('');
    } catch (erro) {
      setAvisoPasto({ tipo: 'erro', texto: extrairMensagem(erro, 'Não foi possível mover o animal.') });
    }
  }

  return (
    <div>
      <header>
        <h1>Manejo</h1>
      </header>

      <form onSubmit={handleBuscar}>
        <label htmlFor="brinco">Brinco</label>
        <input id="brinco" value={brinco} onChange={(e) => setBrinco(e.target.value)} required />
        <button type="submit">Buscar</button>
      </form>
      {erroBusca && <Aviso tipo="erro">{erroBusca}</Aviso>}

      {animal && (
        <>
          {avisoReemissao && <Aviso tipo="atencao">{avisoReemissao}</Aviso>}

          <section>
            <h2>Brinco {formatarBrinco(animal.brinco)}</h2>
            <p>Sexo: {formatarSexo(animal.sexo)}</p>
            <p>
              Categoria: {editandoCategoria ? (
                <>
                  <select value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)}>
                    {CATEGORIAS_POR_SEXO[animal.sexo].map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {ROTULOS_CATEGORIA[opcao]}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={handleSalvarCategoria}>Salvar</button>
                  <button type="button" onClick={() => setEditandoCategoria(false)}>Cancelar</button>
                </>
              ) : (
                <>
                  {formatarCategoria(animal.categoria)}{' '}
                  <button type="button" onClick={() => setEditandoCategoria(true)}>Editar</button>
                </>
              )}
            </p>
            {avisoCategoria && <Aviso tipo={avisoCategoria.tipo}>{avisoCategoria.texto}</Aviso>}
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
            {avisoPeso && <Aviso tipo={avisoPeso.tipo}>{avisoPeso.texto}</Aviso>}
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
            {avisoTratamento && <Aviso tipo={avisoTratamento.tipo}>{avisoTratamento.texto}</Aviso>}
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
            {avisoPasto && <Aviso tipo={avisoPasto.tipo}>{avisoPasto.texto}</Aviso>}
          </section>

          <Link to={`/animais/${animal.id}`}>Ver histórico completo</Link>
        </>
      )}
    </div>
  );
}