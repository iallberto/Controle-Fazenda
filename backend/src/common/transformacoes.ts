import { Transform } from 'class-transformer';

// E-mails são guardados e comparados sempre em minúsculas e sem espaços
export const NormalizarEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
