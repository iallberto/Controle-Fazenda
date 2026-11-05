import { EntityManager } from 'typeorm';

// Ganchos entre módulos pagos (spec 006, research R1). Um módulo avisa que
// algo com dinheiro aconteceu — dentro da própria transação, com o manager —
// e o Financeiro reage sem que um módulo pago importe outro (fronteira da
// fase 0). Sem ouvinte (Financeiro não carregado), nada acontece. Um gancho
// que lança erro desfaz a operação de quem emitiu.
export interface EventosModulos {
  leiteRecebido: {
    fazendaId: string;
    recebimentoId: string;
    mes: string;
    data: string;
    litros: number;
    valorCentavos: number;
    caminho: string;
    usuarioId: string;
  };
  leiteRecebimentoDesfeito: {
    fazendaId: string;
    recebimentoId: string;
    motivo: string;
    usuarioId: string;
  };
  nutricaoCompraValorada: {
    fazendaId: string;
    entradaId: string;
    tipoInsumo: string;
    categoriaId: string | null;
    data: string;
    descricao: string;
    valorCentavos: number;
    caminho: string;
    usuarioId: string;
  };
  nutricaoEntradaCancelada: {
    fazendaId: string;
    entradaId: string;
    motivo: string;
    usuarioId: string;
  };
}

export type EventoModulo = keyof EventosModulos;

export type GanchoModulo<E extends EventoModulo> = (
  manager: EntityManager,
  dados: EventosModulos[E],
) => Promise<void>;

type Registro = { [E in EventoModulo]: GanchoModulo<E>[] };

const vazio = (): Registro => ({
  leiteRecebido: [],
  leiteRecebimentoDesfeito: [],
  nutricaoCompraValorada: [],
  nutricaoEntradaCancelada: [],
});

let registro: Registro = vazio();

export const ganchosModulos = {
  registrar<E extends EventoModulo>(evento: E, gancho: GanchoModulo<E>) {
    (registro[evento] as GanchoModulo<E>[]).push(gancho);
  },

  async emitir<E extends EventoModulo>(
    evento: E,
    manager: EntityManager,
    dados: EventosModulos[E],
  ) {
    for (const gancho of registro[evento] as GanchoModulo<E>[]) {
      await gancho(manager, dados);
    }
  },

  // Para os testes
  limpar() {
    registro = vazio();
  },
};
