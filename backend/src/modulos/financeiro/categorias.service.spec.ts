import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { TipoLancamento } from './entities/categoria-financeira.entity';

describe('CategoriasService (FR-005, FR-006)', () => {
  const repo = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((dados: object) => dados),
    save: jest.fn(async (dados: object) => ({ id: 'c-nova', ...dados })),
    update: jest.fn(),
  };
  const service = new CategoriasService(repo as never);

  const padrao = {
    id: 'c1',
    fazendaId: null,
    tipo: TipoLancamento.DESPESA,
    nome: 'Ração e sal',
    codigo: 'RACAO_SAL',
    ativa: true,
  };
  const daFazenda = {
    id: 'c2',
    fazendaId: 'f1',
    tipo: TipoLancamento.DESPESA,
    nome: 'Frete',
    codigo: null,
    ativa: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo.find.mockResolvedValue([padrao, daFazenda]);
  });

  it('lista padrões e da fazenda, marcando as padrão', async () => {
    const lista = await service.listar('f1', { tipo: TipoLancamento.DESPESA });
    expect(lista.map((c) => [c.nome, c.padrao])).toEqual([
      ['Frete', false],
      ['Ração e sal', true],
    ]);
  });

  it('esconde as desativadas, a não ser que peça', async () => {
    repo.find.mockResolvedValue([padrao, { ...daFazenda, ativa: false }]);
    expect(await service.listar('f1')).toHaveLength(1);
    expect(await service.listar('f1', { incluirInativas: true })).toHaveLength(
      2,
    );
  });

  it('cria categoria da fazenda', async () => {
    const nova = await service.criar('f1', {
      tipo: TipoLancamento.DESPESA,
      nome: 'Combustível do trator',
    });
    expect(nova).toMatchObject({ fazendaId: 'f1', codigo: null, ativa: true });
  });

  it('nome repetido, sem ligar para acento e maiúscula: 409', async () => {
    await expect(
      service.criar('f1', {
        tipo: TipoLancamento.DESPESA,
        nome: 'RACAO E SAL',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('categoria padrão não é renomeada nem desativada: 400', async () => {
    repo.findOneBy.mockResolvedValue(padrao);
    await expect(service.editar('f1', 'c1', { ativa: false })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('categoria de outra fazenda: 404', async () => {
    repo.findOneBy.mockResolvedValue({ ...daFazenda, fazendaId: 'f2' });
    await expect(service.editar('f1', 'c2', { nome: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('desativa categoria da fazenda', async () => {
    repo.findOneBy.mockResolvedValue(daFazenda);
    await service.editar('f1', 'c2', { ativa: false });
    expect(repo.update).toHaveBeenCalledWith({ id: 'c2' }, { ativa: false });
  });

  describe('validarParaLancar', () => {
    it('tipo diferente do lançamento: 400', async () => {
      repo.findOneBy.mockResolvedValue(padrao);
      await expect(
        service.validarParaLancar('f1', 'c1', TipoLancamento.RECEITA),
      ).rejects.toThrow('categoria de receita');
    });

    it('categoria desativada: 400', async () => {
      repo.findOneBy.mockResolvedValue({ ...daFazenda, ativa: false });
      await expect(
        service.validarParaLancar('f1', 'c2', TipoLancamento.DESPESA),
      ).rejects.toThrow('desativada');
    });
  });
});
