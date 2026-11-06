import { useAuth } from '../contexts/useAuth';

// Faixa do acesso de suporte (spec 008, FR-004): sempre visível enquanto o
// administrador está dentro da fazenda do cliente, com o botão de sair.
export function FaixaSuporte() {
  const { usuario, sairDoSuporte } = useAuth();
  if (!usuario?.suporte) return null;
  return (
    <div className="faixa-suporte nao-imprimir" role="status">
      <span>
        Você está na <strong>{usuario.fazendaNome ?? 'fazenda do cliente'}</strong> como suporte
        {usuario.fazendaSuspensa && ' · fazenda suspensa'}
      </span>
      <button type="button" onClick={() => void sairDoSuporte()}>
        Sair
      </button>
    </div>
  );
}
