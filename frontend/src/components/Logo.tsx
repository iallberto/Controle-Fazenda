// Logo provisória: um brinco (a etiqueta do QR em branco). O mesmo desenho
// está em public/favicon.svg; trocar os dois juntos quando houver logo definitiva.
export function Logo({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className="logo"
    >
      <path
        fill="currentColor"
        d="M25 3h14a6 6 0 0 1 6 6v12l13 10v24a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V31l13-10V9a6 6 0 0 1 6-6z"
      />
      <circle cx="32" cy="13" r="5" fill="var(--cor-fundo-logo, #fff)" />
      <rect x="13" y="36" width="38" height="19" rx="3" fill="var(--cor-fundo-logo, #fff)" />
      <rect x="17" y="40" width="11" height="11" rx="1" fill="currentColor" />
      <rect x="32" y="41" width="15" height="3" rx="1.5" fill="currentColor" />
      <rect x="32" y="47" width="10" height="3" rx="1.5" fill="currentColor" />
    </svg>
  );
}
