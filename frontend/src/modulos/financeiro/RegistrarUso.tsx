import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { buscarPorBrinco } from '../../api/animais';
import { listarPastos, type Pasto } from '../../api/pastos';
import { Aviso } from '../../components/Aviso';
import { hojeLocal } from '../../utils/datas';
import { categoriasParaUso, registrarUso } from './api';
import { useFinanceiro } from './FinanceiroContext';

const UNIDADES = ['sacos', 'kg', 'litros', 'frascos', 'doses', 'unidades', 'metros', 'horas'];

// Registro de item usado ou trazido, sem valor (spec 003, US4, FR-022). Feito
// para o funcionário no curral: item, quantidade, unidade e categoria.
export function RegistrarUso() {
  const { soConsulta } = useFinanceiro();
  const navigate = useNavigate();
  const [item, setItem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('sacos');
  const [categoriaId, setCategoriaId] = useState('');
  const [data, setData] = useState(hojeLocal);
  const [ligacao, setLigacao] = useState<'NADA' | 'ANIMAL' | 'PASTO'>('NADA');
  const [brinco, setBrinco] = useState('');
  const [pastoId, setPastoId] = useState('');
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [pastos, setPastos] = useState<Pasto[]>([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    categoriasParaUso().then(setCategorias).catch(() => {});
    listarPastos().then(setPastos).catch(() => {});
  }, []);

  if (soConsulta) return <Navigate to="/modulos/financeiro/usos" replace />;

  async function handleSalvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    const qtd = Number(quantidade.replace(',', '.'));
    if (!(qtd > 0)) {
      setErro('Informe a quantidade, por exemplo 10');
      return;
    }
    setEnviando(true);
    try {
      const animalId = ligacao === 'ANIMAL' && brinco.trim() ? (await buscarPorBrinco(brinco.trim())).id : undefined;
      await registrarUso({
        data,
        item: item.trim(),
        quantidade: qtd,
        unidade,
        categoriaId,
        animalId,
        pastoId: ligacao === 'PASTO' && pastoId ? pastoId : undefined,
      });
      navigate('/modulos/financeiro/usos', {
        state: { aviso: `Registrado: ${item.trim()}, ${quantidade} ${unidade}.` },
      });
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível registrar.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <header>
        <h1>Registrar uso</h1>
        <Link to="/modulos/financeiro/usos">Registros</Link>
      </header>
      <p>Anote o que foi usado ou trazido. O valor fica com o dono.</p>

      <form onSubmit={handleSalvar}>
        <div>
          <label htmlFor="uso-item">Item</label>
          <input
            id="uso-item"
            maxLength={120}
            placeholder="Ex.: sal mineral, diesel, vacina"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="linha-quantidade">
          <div>
            <label htmlFor="uso-quantidade">Quantidade</label>
            <input
              id="uso-quantidade"
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="uso-unidade">Unidade</label>
            <select id="uso-unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)}>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="uso-categoria">Categoria</label>
          <select id="uso-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
            <option value="">Selecione</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="uso-data">Data</label>
          <input id="uso-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="uso-ligacao">Usado em (opcional)</label>
          <select id="uso-ligacao" value={ligacao} onChange={(e) => setLigacao(e.target.value as typeof ligacao)}>
            <option value="NADA">Nada específico</option>
            <option value="ANIMAL">Um animal</option>
            <option value="PASTO">Um pasto</option>
          </select>
        </div>
        {ligacao === 'ANIMAL' && (
          <div>
            <label htmlFor="uso-brinco">Brinco do animal</label>
            <input id="uso-brinco" inputMode="numeric" value={brinco} onChange={(e) => setBrinco(e.target.value)} />
          </div>
        )}
        {ligacao === 'PASTO' && (
          <div>
            <label htmlFor="uso-pasto">Pasto</label>
            <select id="uso-pasto" value={pastoId} onChange={(e) => setPastoId(e.target.value)}>
              <option value="">Selecione</option>
              {pastos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Registrando...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
}
