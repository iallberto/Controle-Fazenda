import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { criarTratamento } from '../api/tratamentos';
import { listarAnimais, type Animal } from '../api/animais';
import { listarUsuarios, type Usuario } from '../api/usuarios';
import { listarVeterinarios, type Veterinario } from '../api/veterinarios';
import { useAuth } from '../contexts/useAuth';

export function NovoTratamento() {
  const navigate = useNavigate();
  const { usuario: usuarioLogado } = useAuth();
  const [erro, setErro] = useState('');

  const [animalId, setAnimalId] = useState('');
  const [produto, setProduto] = useState('');
  const [data, setData] = useState('');
  const [temRecorrencia, setTemRecorrencia] = useState(false);
  const [recorrenciaDias, setRecorrenciaDias] = useState('');

  const [aplicadoPorTipo, setAplicadoPorTipo] = useState<'USUARIO' | 'VETERINARIO'>('USUARIO');
  const [aplicadoPorUsuarioId, setAplicadoPorUsuarioId] = useState(usuarioLogado?.id ?? '');
  const [aplicadoPorVeterinarioId, setAplicadoPorVeterinarioId] = useState('');

  const [animais, setAnimais] = useState<Animal[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);

  useEffect(() => {
    listarAnimais().then(setAnimais);
    listarUsuarios().then(setUsuarios);
    listarVeterinarios().then((lista) => setVeterinarios(lista.filter((v) => v.ativo)));
  }, []);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro('');

    try {
      await criarTratamento({
        animalId,
        produto,
        data,
        recorrenciaDias: temRecorrencia ? Number(recorrenciaDias) : undefined,
        aplicadoPorTipo,
        aplicadoPorUsuarioId: aplicadoPorTipo === 'USUARIO' ? aplicadoPorUsuarioId : undefined,
        aplicadoPorVeterinarioId:
          aplicadoPorTipo === 'VETERINARIO' ? aplicadoPorVeterinarioId : undefined,
      });
      navigate('/animais');
    } catch (erroRequisicao) {
      const mensagem =
        axios.isAxiosError(erroRequisicao) && erroRequisicao.response?.data?.message
          ? erroRequisicao.response.data.message
          : 'Não foi possível registrar o tratamento. Confira os dados.';
      setErro(Array.isArray(mensagem) ? mensagem.join(', ') : mensagem);
    }
  }

  return (
    <div>
      <header>
        <h1>Registrar tratamento</h1>
        <Link to="/animais">Voltar</Link>
      </header>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="animal">Animal</label>
          <select id="animal" value={animalId} onChange={(e) => setAnimalId(e.target.value)} required>
            <option value="">Selecione o animal</option>
            {animais.map((animal) => (
              <option key={animal.id} value={animal.id}>
                {animal.brinco}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="produto">Produto</label>
          <input id="produto" value={produto} onChange={(e) => setProduto(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="data">Data</label>
          <input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="aplicadoPorTipo">Aplicado por</label>
          <select
            id="aplicadoPorTipo"
            value={aplicadoPorTipo}
            onChange={(e) => setAplicadoPorTipo(e.target.value as typeof aplicadoPorTipo)}
          >
            <option value="USUARIO">Funcionário / Dono</option>
            <option value="VETERINARIO">Veterinário</option>
          </select>
        </div>

        {aplicadoPorTipo === 'USUARIO' ? (
          <div>
            <label htmlFor="aplicadoPorUsuario">Quem aplicou</label>
            <select
              id="aplicadoPorUsuario"
              value={aplicadoPorUsuarioId}
              onChange={(e) => setAplicadoPorUsuarioId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label htmlFor="aplicadoPorVeterinario">Qual veterinário</label>
            <select
              id="aplicadoPorVeterinario"
              value={aplicadoPorVeterinarioId}
              onChange={(e) => setAplicadoPorVeterinarioId(e.target.value)}
              required
            >
              <option value="">Selecione</option>
              {veterinarios.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                  {v.crmv ? ` (${v.crmv})` : ''}
                </option>
              ))}
            </select>
            <Link to="/veterinarios/novo">Cadastrar novo veterinário</Link>
          </div>
        )}

        <div>
          <label>
            <input
              type="checkbox"
              checked={temRecorrencia}
              onChange={(e) => setTemRecorrencia(e.target.checked)}
            />
            Este tratamento se repete periodicamente
          </label>
        </div>

        {temRecorrencia && (
          <div>
            <label htmlFor="recorrencia">A cada quantos dias?</label>
            <input
              id="recorrencia"
              type="number"
              min="1"
              value={recorrenciaDias}
              onChange={(e) => setRecorrenciaDias(e.target.value)}
              required
            />
          </div>
        )}

        {erro && <p style={{ color: 'red' }}>{erro}</p>}
        <button type="submit">Registrar</button>
      </form>
    </div>
  );
}