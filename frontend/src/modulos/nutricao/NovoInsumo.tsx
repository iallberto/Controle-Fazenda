import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mensagemDeErro } from '../../api/client';
import { Aviso } from '../../components/Aviso';
import {
  criarInsumo,
  criarUnidade,
  editarInsumo,
  numeroDeTexto,
  ROTULOS_BASE,
  ROTULOS_TIPO,
  type TipoInsumo,
  type UnidadeBase,
} from './api';

// Cadastro de insumo pelo dono (spec 005, FR-004, FR-004a): unidade base e,
// opcionalmente, a unidade de compra (ex.: saco de 25 kg)
export function NovoInsumo() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoInsumo>('RACAO');
  const [base, setBase] = useState<UnidadeBase>('KG');
  const [minimo, setMinimo] = useState('');
  const [unidadeCompra, setUnidadeCompra] = useState('');
  const [fator, setFator] = useState('');
  const [erro, setErro] = useState('');

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    const fatorNumero = numeroDeTexto(fator);
    if (unidadeCompra && (!fatorNumero || fatorNumero <= 0)) {
      setErro('Informe quantos ' + ROTULOS_BASE[base] + ' tem a unidade de compra.');
      return;
    }
    try {
      const minimoNumero = numeroDeTexto(minimo);
      const insumo = await criarInsumo({
        nome,
        tipo,
        unidadeBase: tipo === 'SILAGEM' ? 'KG' : base,
        estoqueMinimo: minimoNumero ?? undefined,
      });
      if (unidadeCompra && fatorNumero) {
        const unidade = await criarUnidade(insumo.id, { nome: unidadeCompra, fator: fatorNumero });
        await editarInsumo(insumo.id, { unidadeCompraId: unidade.id });
      }
      navigate(`/modulos/nutricao/insumos/${insumo.id}`);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível cadastrar o insumo.'));
    }
  }

  const rotuloBase = ROTULOS_BASE[tipo === 'SILAGEM' ? 'KG' : base];

  return (
    <div>
      <header>
        <h1>Novo insumo</h1>
        <Link to="/modulos/nutricao/estoque">Voltar</Link>
      </header>
      <form onSubmit={salvar}>
        <label htmlFor="nome-insumo">Nome</label>
        <input id="nome-insumo" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} required />
        <label htmlFor="tipo-insumo">Tipo</label>
        <select id="tipo-insumo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoInsumo)}>
          {(Object.keys(ROTULOS_TIPO) as TipoInsumo[]).map((t) => (
            <option key={t} value={t}>
              {ROTULOS_TIPO[t]}
            </option>
          ))}
        </select>
        {tipo !== 'SILAGEM' && (
          <>
            <label htmlFor="base-insumo">Unidade de controle do estoque</label>
            <select id="base-insumo" value={base} onChange={(e) => setBase(e.target.value as UnidadeBase)}>
              <option value="KG">kg</option>
              <option value="LITRO">litro</option>
              <option value="UNIDADE">unidade</option>
            </select>
          </>
        )}
        <label htmlFor="minimo-insumo">Estoque mínimo ({rotuloBase}, opcional)</label>
        <input id="minimo-insumo" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
        <fieldset>
          <legend>Unidade de compra (opcional)</legend>
          <label htmlFor="unidade-compra">Nome (ex.: saco, fardo)</label>
          <input id="unidade-compra" value={unidadeCompra} maxLength={30} onChange={(e) => setUnidadeCompra(e.target.value)} />
          <label htmlFor="fator-compra">Quantos {rotuloBase} tem</label>
          <input id="fator-compra" inputMode="decimal" value={fator} onChange={(e) => setFator(e.target.value)} />
        </fieldset>
        <p className="dica">
          {rotuloBase === 'kg' ? 'kg e tonelada já vêm prontas. ' : ''}Outras unidades podem ser
          acrescentadas depois, na página do insumo.
        </p>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
}
