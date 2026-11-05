// "Vaca de leite?" no cadastro da matriz, só com o Leite ativo (pedido do dono
// do produto, 2026-11-05). Sim: depois do cadastro ela é marcada como vaca de
// leite e já entra na ordenha a partir de hoje (colocarNaOrdenha, em api.ts).
export function CampoVacaDeLeite({
  valor,
  aoMudar,
}: {
  valor: boolean;
  aoMudar: (vacaDeLeite: boolean) => void;
}) {
  return (
    <fieldset className="campo-vaca-de-leite">
      <legend>Vaca de leite?</legend>
      <label>
        <input type="radio" name="vaca-de-leite" value="sim" checked={valor} onChange={() => aoMudar(true)} />
        Sim
      </label>
      <label>
        <input type="radio" name="vaca-de-leite" value="nao" checked={!valor} onChange={() => aoMudar(false)} />
        Não
      </label>
      <small>{valor ? 'Ela já entra na ordenha a partir de hoje.' : 'Não entra na ordenha.'}</small>
    </fieldset>
  );
}
