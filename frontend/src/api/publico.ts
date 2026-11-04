import { apiClient } from './client';

export interface PesagemPublica {
  data: string;
  pesoKg: number;
  gmdDesdeAnterior: number | null;
}

export interface AnimalPublico {
  brinco: string;
  raca: string | null;
  sexo: 'M' | 'F';
  categoria: string;
  dataNascimento: string;
  origem: string;
  maeBrinco: string | null;
  // Arrobas calculadas com o peso de referência da categoria configurado pela fazenda
  pesoAtual: (PesagemPublica & { arrobas: number }) | null;
  pesagens: PesagemPublica[];
  tratamentos: { produto: string; data: string }[];
}

// Fazenda suspensa pelo administrador: só o básico, sem pesos nem histórico
// (spec 002, FR-028)
export type AnimalPublicoBasico = Pick<AnimalPublico, 'brinco' | 'raca' | 'sexo' | 'categoria'>;

export type ConsultaPublica =
  | {
      situacao: 'ATIVO' | 'FORA_DO_REBANHO' | 'ETIQUETA_SUBSTITUIDA';
      fazenda: { nome: string };
      animal: AnimalPublico | null;
    }
  | {
      situacao: 'FAZENDA_SUSPENSA';
      fazenda: { nome: string };
      animal: AnimalPublicoBasico;
    };

// Rota sem login, usada por quem escaneia o QR da etiqueta
export async function consultarAnimalPublico(codigo: string): Promise<ConsultaPublica> {
  const resposta = await apiClient.get<ConsultaPublica>(
    `/publico/animal/${encodeURIComponent(codigo)}`,
  );
  return resposta.data;
}
