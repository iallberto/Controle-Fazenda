import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { VendasService } from './vendas.service';
import { StatusAnimal } from '../../animal/entities/animal.entity';
import { Pesagem } from '../../pesagem/entities/pesagem.entity';
import {
  FormaPrecoVenda,
  ItemVenda,
  VendaAnimais,
} from './entities/venda-animais.entity';
import { Lancamento, OrigemLancamento } from './entities/lancamento.entity';
import { TipoLancamento } from './entities/categoria-financeira.entity';
import {
  registrarSaidaDoRebanho,
  voltarAoRebanho,
} from '../../animal/saida-do-rebanho';

jest.mock('../../animal/saida-do-rebanho', () => ({
  registrarSaidaDoRebanho: jest.fn(),
  voltarAoRebanho: jest.fn(),
}));

describe('VendasService (US2, FR-010 a FR-016)', () => {
  const itensRepoNaTransacao = { findOne: jest.fn() };
  const manager = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getRepository: jest.fn(() => itensRepoNaTransacao),
  };
  const vendaRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const itemRepo = { findOne: jest.fn() };
  const animalRepo = { find: jest.fn() };
  const pesagemRepo = { find: jest.fn() };
  const valorArrobaRepo = { find: jest.fn() };
  const categorias = { porCodigo: jest.fn() };
  const lancamentos = { lancarNaTransacao: jest.fn() };
  const service = new VendasService(
    vendaRepo as never,
    itemRepo as never,
    animalRepo as never,
    pesagemRepo as never,
    valorArrobaRepo as never,
    categorias as never,
    lancamentos as never,
  );

  const garrote = (id: string, brinco: string, extra: object = {}) => ({
    id,
    fazendaId: 'f1',
    brinco,
    categoria: 'GARROTE',
    status: StatusAnimal.ATIVO,
    pastoAtualId: 'p1',
    ...extra,
  });

  const dto = {
    data: '2026-11-04',
    comprador: 'Frigorífico Boa Vista',
    forma: FormaPrecoVenda.POR_ARROBA,
    precoArrobaCentavos: 30000,
    itens: [{ animalId: 'a1', pesoKg: 450 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    vendaRepo.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    manager.create.mockImplementation((_e: unknown, dados: object) => dados);
    manager.save.mockImplementation(async (dados: object) => ({
      id: 'gerado',
      ...dados,
    }));
    manager.find.mockResolvedValue([garrote('a1', '12')]);
    animalRepo.find.mockResolvedValue([garrote('a1', '12')]);
    itensRepoNaTransacao.findOne.mockResolvedValue(null);
    itemRepo.findOne.mockResolvedValue(null);
    valorArrobaRepo.find.mockResolvedValue([
      { categoria: 'GARROTE', pesoReferenciaKg: '15.00' },
    ]);
    categorias.porCodigo.mockResolvedValue({ id: 'cat-venda' });
    // detalhar depois de registrar
    vendaRepo.findOne.mockResolvedValue({
      id: 'gerado',
      fazendaId: 'f1',
      itens: [],
      cancelamento: { cancelado: false },
    });
  });

  it('registra venda, item, pesagem, saída do rebanho e receita na mesma transação', async () => {
    await service.registrar('f1', 'dono', dto);

    expect(vendaRepo.manager.transaction).toHaveBeenCalledTimes(1);
    expect(manager.create).toHaveBeenCalledWith(
      VendaAnimais,
      expect.objectContaining({
        valorTotalCentavos: 900000,
        precoArrobaCentavos: 30000,
        comprador: 'Frigorífico Boa Vista',
      }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      Pesagem,
      expect.objectContaining({
        animalId: 'a1',
        pesoKg: 450,
        observacao: 'Pesagem de venda',
      }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      ItemVenda,
      expect.objectContaining({
        animalId: 'a1',
        arrobas: '30',
        valorCentavos: 900000,
        pastoAnteriorId: 'p1',
        categoriaNaVenda: 'GARROTE',
      }),
    );
    expect(registrarSaidaDoRebanho).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        status: StatusAnimal.VENDIDO,
        data: '2026-11-04',
        motivo: 'Venda para Frigorífico Boa Vista',
      }),
    );
    expect(lancamentos.lancarNaTransacao).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        tipo: TipoLancamento.RECEITA,
        valorCentavos: 900000,
        categoriaId: 'cat-venda',
        origem: OrigemLancamento.VENDA,
        animalId: 'a1',
      }),
    );
  });

  it('animal fora do rebanho: 400 e nada gravado', async () => {
    manager.find.mockResolvedValue([
      garrote('a1', '12', { status: StatusAnimal.MORTO }),
    ]);
    await expect(service.registrar('f1', 'dono', dto)).rejects.toThrow(
      'não está mais no rebanho',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('animal de outra fazenda: 404', async () => {
    manager.find.mockResolvedValue([garrote('a1', '12', { fazendaId: 'f2' })]);
    await expect(service.registrar('f1', 'dono', dto)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('animal já em outra venda: 409', async () => {
    itensRepoNaTransacao.findOne.mockResolvedValue({
      animal: { brinco: '12' },
    });
    await expect(service.registrar('f1', 'dono', dto)).rejects.toThrow(
      ConflictException,
    );
  });

  it('por arroba sem peso: 400', async () => {
    await expect(
      service.registrar('f1', 'dono', {
        ...dto,
        itens: [{ animalId: 'a1' }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('animal repetido: 400', async () => {
    await expect(
      service.registrar('f1', 'dono', {
        ...dto,
        itens: [
          { animalId: 'a1', pesoKg: 450 },
          { animalId: 'a1', pesoKg: 450 },
        ],
      }),
    ).rejects.toThrow('repetidos');
  });

  it('erro no meio da transação propaga e não segue gravando', async () => {
    categorias.porCodigo.mockRejectedValue(new Error('falhou'));
    await expect(service.registrar('f1', 'dono', dto)).rejects.toThrow(
      'falhou',
    );
    expect(lancamentos.lancarNaTransacao).not.toHaveBeenCalled();
  });

  it('simular calcula sem gravar', async () => {
    const r = await service.simular('f1', dto);
    expect(r).toMatchObject({ arrobasTotal: 30, valorTotalCentavos: 900000 });
    expect(vendaRepo.manager.transaction).not.toHaveBeenCalled();
  });

  describe('cancelar (FR-015)', () => {
    it('cancela a venda e a receita e devolve os animais ao pasto de antes', async () => {
      vendaRepo.findOne.mockResolvedValue({
        id: 'v1',
        fazendaId: 'f1',
        cancelamento: { cancelado: false },
        itens: [
          { animalId: 'a1', pastoAnteriorId: 'p1' },
          { animalId: 'a2', pastoAnteriorId: null },
        ],
      });

      await service.cancelar('f1', 'dono', 'v1', 'venda desfeita');

      expect(manager.update).toHaveBeenCalledWith(
        VendaAnimais,
        { id: 'v1' },
        expect.objectContaining({
          cancelamento: expect.objectContaining({
            cancelado: true,
            motivoCancelamento: 'venda desfeita',
          }),
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(
        Lancamento,
        { vendaId: 'v1' },
        expect.objectContaining({
          cancelamento: expect.objectContaining({ cancelado: true }),
        }),
      );
      expect(voltarAoRebanho).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ animalId: 'a1', pastoId: 'p1' }),
      );
      expect(voltarAoRebanho).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ animalId: 'a2', pastoId: null }),
      );
    });

    it('já cancelada: 400; de outra fazenda: 404', async () => {
      vendaRepo.findOne.mockResolvedValue({
        id: 'v1',
        fazendaId: 'f1',
        cancelamento: { cancelado: true },
        itens: [],
      });
      await expect(service.cancelar('f1', 'dono', 'v1', 'x')).rejects.toThrow(
        BadRequestException,
      );
      vendaRepo.findOne.mockResolvedValue({
        id: 'v1',
        fazendaId: 'f2',
        cancelamento: { cancelado: false },
        itens: [],
      });
      await expect(service.cancelar('f1', 'dono', 'v1', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
