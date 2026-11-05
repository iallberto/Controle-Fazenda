import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Insumo, TipoInsumo, UnidadeBase } from './entities/insumo.entity';
import { MotivoMovimento, MovimentoInsumo, TipoMovimento } from './entities/movimento-insumo.entity';
import { Silo, TipoSilo } from './entities/silo.entity';
import { SilosService } from './silos.service';
import { managerFalso } from './manager-falso.helper-spec';

const HOJE = '2026-10-10';

describe('SilosService (spec 005, US3)', () => {
  let manager: ReturnType<typeof managerFalso>;
  let silos: SilosService;
  const silagem = {
    id: 'sil',
    fazendaId: 'f1',
    nome: 'Silagem de milho',
    tipo: TipoInsumo.SILAGEM,
    unidadeBase: UnidadeBase.KG,
    unidades: [{ id: 'sil-kg', nome: 'kg', fator: 1, ativa: true }],
  };
  const siloFechado = () => ({
    id: 's1',
    fazendaId: 'f1',
    insumoId: 'sil',
    nome: 'Trincheira 1',
    tipo: TipoSilo.TRINCHEIRA,
    toneladasEnsiladas: 300,
    custoEnsilagemCentavos: 4500000,
    fechamento: '2026-03-15',
    abertura: null as string | null,
    encerramento: null as string | null,
    entradaId: null as string | null,
    insumo: silagem,
  });

  beforeEach(() => {
    manager = managerFalso();
    silos = new SilosService(manager as never);
    manager.dados.set(Insumo, [silagem]);
  });

  it('cadastro: só insumo de silagem em kg; nome repetido → 409; fechamento futuro → 400', async () => {
    manager.dados.set(Insumo, [silagem, { id: 'rac', fazendaId: 'f1', tipo: TipoInsumo.RACAO, unidadeBase: UnidadeBase.KG }]);
    manager.dados.set(Silo, [siloFechado()]);
    const base = { nome: 'Trincheira 2', tipo: TipoSilo.TRINCHEIRA, insumoId: 'sil', toneladasEnsiladas: 200, fechamento: '2026-04-01' };
    await expect(silos.criar('f1', 'u1', base, HOJE)).resolves.toMatchObject({ nome: 'Trincheira 2' });
    await expect(silos.criar('f1', 'u1', { ...base, insumoId: 'rac' }, HOJE)).rejects.toBeInstanceOf(BadRequestException);
    await expect(silos.criar('f1', 'u1', { ...base, nome: 'trincheira 1' }, HOJE)).rejects.toBeInstanceOf(ConflictException);
    await expect(silos.criar('f1', 'u1', { ...base, fechamento: '2026-10-11' }, HOJE)).rejects.toBeInstanceOf(BadRequestException);
    await expect(silos.criar('f2', 'u1', base, HOJE)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('abrir lança a entrada de produção própria: 300 t = 300.000 kg com o custo da ensilagem', async () => {
    const silo = siloFechado();
    manager.dados.set(Silo, [silo]);
    const r = await silos.abrir('f1', 'u1', 's1', '2026-10-01', HOJE);
    expect(r).toMatchObject({ abertura: '2026-10-01', entradaKg: 300000 });
    expect(manager.create).toHaveBeenCalledWith(
      MovimentoInsumo,
      expect.objectContaining({
        tipo: TipoMovimento.ENTRADA,
        motivo: MotivoMovimento.SILO,
        quantidadeBase: 300000,
        valorCentavos: 4500000,
        siloId: 's1',
      }),
    );
    expect(silo.abertura).toBe('2026-10-01');
  });

  it('abrir antes do fechamento, no futuro ou de novo → 400', async () => {
    manager.dados.set(Silo, [siloFechado()]);
    await expect(silos.abrir('f1', 'u1', 's1', '2026-03-01', HOJE)).rejects.toBeInstanceOf(BadRequestException);
    await expect(silos.abrir('f1', 'u1', 's1', '2026-10-11', HOJE)).rejects.toBeInstanceOf(BadRequestException);
    manager.dados.set(Silo, [{ ...siloFechado(), abertura: '2026-10-01' }]);
    await expect(silos.abrir('f1', 'u1', 's1', '2026-10-02', HOJE)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancelar a abertura só sem silagem fornecida; cancela a entrada', async () => {
    const entrada = { id: 'e1', cancelamento: { cancelado: false } };
    const silo = { ...siloFechado(), abertura: '2026-10-01', entradaId: 'e1' };
    manager.dados.set(Silo, [silo]);
    manager.dados.set(MovimentoInsumo, [
      entrada,
      { id: 'b1', siloId: 's1', tipo: TipoMovimento.BAIXA, cancelamento: { cancelado: false } },
    ]);
    await expect(silos.cancelarAbertura('f1', 'u1', 's1', 'x')).rejects.toBeInstanceOf(ConflictException);
    manager.dados.set(MovimentoInsumo, [entrada]);
    await silos.cancelarAbertura('f1', 'u1', 's1', 'Abri o silo errado');
    expect(entrada.cancelamento).toMatchObject({ cancelado: true, motivoCancelamento: 'Abri o silo errado' });
    expect(silo.abertura).toBeNull();
  });

  it('lista: saldo, média e previsão do silo aberto; fechado é reserva; funcionário sem custo', async () => {
    manager.dados.set(Silo, [{ ...siloFechado(), abertura: '2026-10-01' }, { ...siloFechado(), id: 's2', nome: 'Bag' }]);
    manager.dados.set(
      MovimentoInsumo,
      Array.from({ length: 10 }, (_, i) => ({
        siloId: 's1',
        tipo: TipoMovimento.BAIXA,
        data: `2026-10-${String(i + 1).padStart(2, '0')}`,
        quantidadeBase: 3000,
        cancelamento: { cancelado: false },
      })),
    );
    const [aberto, fechado] = await silos.listar('f1', 'FUNCIONARIO', HOJE);
    expect(aberto).toMatchObject({
      situacao: 'ABERTO',
      consumidoKg: 30000,
      saldoKg: 270000,
      mediaKgDia: 3000,
      diasRestantes: 90,
      acabaEm: '2027-01-08',
    });
    expect(fechado).toMatchObject({ situacao: 'FECHADO', saldoKg: 300000, diasRestantes: null });
    expect(JSON.stringify(aberto)).not.toMatch(/custo/i);
    const [donoVe] = await silos.listar('f1', 'DONO', HOJE);
    expect(donoVe).toMatchObject({ custoEnsilagemCentavos: 4500000 });
  });

  it('toneladas não mudam depois de aberto; encerrar entre a abertura e hoje', async () => {
    manager.dados.set(Silo, [{ ...siloFechado(), abertura: '2026-10-01' }]);
    await expect(silos.editar('f1', 'u1', 's1', { toneladasEnsiladas: 10 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(silos.encerrar('f1', 'u1', 's1', '2026-09-30', HOJE)).rejects.toBeInstanceOf(BadRequestException);
    await expect(silos.encerrar('f1', 'u1', 's1', HOJE, HOJE)).resolves.toMatchObject({ encerramento: HOJE });
  });
});
