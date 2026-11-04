import { EntityManager } from 'typeorm';

// Ganchos do rebanho (spec 004, research R1). O pacote inicial avisa que algo
// aconteceu — dentro da própria transação, com o manager — e um módulo pago
// reage sem que o pacote inicial o importe (fronteira da fase 0). O módulo
// registra os seus ganchos ao iniciar. Um gancho que lança erro desfaz a
// transação inteira de quem emitiu.
export interface EventosRebanho {
  partoRegistrado: {
    fazendaId: string;
    maeId: string;
    partoId: string;
    data: string;
    usuarioId: string;
  };
  partoAlterado: {
    fazendaId: string;
    maeId: string;
    partoId: string;
    dataAnterior: string;
    dataNova: string;
    usuarioId: string;
  };
  saidaDoRebanho: {
    fazendaId: string;
    animalId: string;
    data: string;
    usuarioId: string;
  };
  tratamentoGravado: {
    fazendaId: string;
    animalId: string;
    tratamentoId: string;
    produto: string;
    data: string;
    usuarioId: string;
    novo: boolean;
  };
}

export type EventoRebanho = keyof EventosRebanho;

export type GanchoRebanho<E extends EventoRebanho> = (
  manager: EntityManager,
  dados: EventosRebanho[E],
) => Promise<void>;

type Registro = { [E in EventoRebanho]: GanchoRebanho<E>[] };

const vazio = (): Registro => ({
  partoRegistrado: [],
  partoAlterado: [],
  saidaDoRebanho: [],
  tratamentoGravado: [],
});

let registro: Registro = vazio();

export const ganchosRebanho = {
  registrar<E extends EventoRebanho>(evento: E, gancho: GanchoRebanho<E>) {
    (registro[evento] as GanchoRebanho<E>[]).push(gancho);
  },

  // Chama os ganchos em ordem de registro; o primeiro erro interrompe e sobe
  async emitir<E extends EventoRebanho>(
    evento: E,
    manager: EntityManager,
    dados: EventosRebanho[E],
  ) {
    for (const gancho of registro[evento] as GanchoRebanho<E>[]) {
      await gancho(manager, dados);
    }
  },

  // Para os testes
  limpar() {
    registro = vazio();
  },
};
