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

export interface ConsultaPublica {
  situacao: 'ATIVO' | 'FORA_DO_REBANHO' | 'ETIQUETA_SUBSTITUIDA';
  fazenda: { nome: string };
  animal: AnimalPublico | null;
}

// Rota sem login, usada por quem escaneia o QR da etiqueta
export async function consultarAnimalPublico(codigo: string): Promise<ConsultaPublica> {
  const resposta = await apiClient.get<ConsultaPublica>(
    `/publico/animal/${encodeURIComponent(codigo)}`,
  );
  return resposta.data;
}
