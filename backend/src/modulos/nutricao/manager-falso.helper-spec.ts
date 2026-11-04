// Manager simulado por entidade, para os testes da Nutrição (não é teste)
export function managerFalso() {
  const dados = new Map<unknown, Record<string, unknown>[]>();
  const casa = (x: Record<string, unknown>, where: Record<string, unknown> = {}) =>
    Object.entries(where).every(([k, v]) => {
      if (v === null || v === undefined) return true;
      if (typeof v === 'object') {
        // In(...), IsNull(), Between(...) e objetos aninhados: aceita (o teste filtra os dados)
        const tipo = (v as { _type?: string })._type;
        if (tipo === 'isNull') return x[k] === null || x[k] === undefined;
        if (tipo === 'in') return ((v as { _value: unknown[] })._value).includes(x[k]);
        return true;
      }
      return x[k] === v;
    });
  const manager = {
    dados,
    find: jest.fn(async (entidade: unknown, opcoes?: { where?: Record<string, unknown> }) =>
      (dados.get(entidade) ?? []).filter((x) => casa(x, opcoes?.where)),
    ),
    findOne: jest.fn(async (entidade: unknown, opcoes?: { where?: Record<string, unknown> }) =>
      (dados.get(entidade) ?? []).find((x) => casa(x, opcoes?.where)) ?? null,
    ),
    create: jest.fn((_e: unknown, x: object) => ({ ...x })),
    save: jest.fn(async (x: unknown) => {
      if (Array.isArray(x)) return x.map((y: object, i) => ({ id: `novo-${i}`, ...y }));
      const obj = x as Record<string, unknown>;
      return { id: obj.id ?? 'novo', ...obj };
    }),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(async () => [] as unknown[]),
    transaction: jest.fn(),
  };
  manager.transaction.mockImplementation((cb: (m: typeof manager) => unknown) => cb(manager));
  return manager;
}
