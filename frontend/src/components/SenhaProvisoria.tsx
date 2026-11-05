import { useState } from 'react';
import { Aviso } from './Aviso';

// Senha provisória mostrada uma única vez a quem redefiniu (spec 007, FR-004):
// depois de fechar, não há como ver de novo; é preciso redefinir outra vez.
export function SenhaProvisoria({
  para,
  senha,
  aoFechar,
}: {
  para: string;
  senha: string;
  aoFechar: () => void;
}) {
  const [copiada, setCopiada] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiada(true);
    } catch {
      setCopiada(false);
    }
  }

  return (
    <Aviso tipo="atencao" aoFechar={aoFechar}>
      <p>
        Senha provisória de <strong>{para}</strong>:
      </p>
      <p className="senha-provisoria">
        <code>{senha}</code>{' '}
        <button type="button" className="botao-secundario" onClick={copiar}>
          {copiada ? 'Copiada' : 'Copiar'}
        </button>
      </p>
      <p>
        Entregue esta senha à pessoa. No próximo login ela vai criar uma senha nova. Ela não aparece de novo
        depois que este aviso for fechado.
      </p>
    </Aviso>
  );
}
