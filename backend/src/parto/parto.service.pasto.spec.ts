import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PartoService } from './parto.service';
import { Parto, ResultadoParto } from './entities/parto.entity';
import { Animal, CategoriaAnimal, Sexo } from '../animal/entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { CreatePartoDto } from './dto/create-parto.dto';

describe('PartoService - pasto da cria (M9)', () => {
  let service: PartoService;

  const manager = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
  const partoRepository = { manager: { transaction: jest.fn() } };
  const animalRepository = { findOneBy: jest.fn() };
  const codigoRepository = { findOneBy: jest.fn() };
  const pastoRepository = { findOneBy: jest.fn() };

  const dto = {
    maeId: 'm1',
    data: '2026-10-27',
    tipo: 'NORMAL',
    resultado: ResultadoParto.VIVO,
    pastoId: 'p1',
    crias: [
      { codigoId: 'c1', sexo: Sexo.M },
      { codigoId: 'c2', sexo: Sexo.F },
    ],
  } as unknown as CreatePartoDto;

  beforeEach(async () => {
    jest.resetAllMocks();
    manager.create.mockImplementation((_e: unknown, dados: object) => ({ ...dados }));
    manager.save.mockImplementation(async (e: object) => ({ id: 'gerado', ...e }));
    manager.findOne.mockResolvedValue({ id: 'gerado' });
    partoRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    animalRepository.findOneBy.mockResolvedValue({
      id: 'm1',
      fazendaId: 'f1',
      categoria: CategoriaAnimal.MATRIZ,
      racaId: null,
    });
    codigoRepository.findOneBy.mockImplementation(async ({ id }: { id: string }) => ({
      id,
      fazendaId: 'f1',
      numero: id === 'c1' ? 7 : 8,
      status: StatusCodigo.DISPONIVEL,
    }));
    pastoRepository.findOneBy.mockResolvedValue({ id: 'p1', fazendaId: 'f1' });

    const module = await Test.createTestingModule({
      providers: [
        PartoService,
        { provide: getRepositoryToken(Parto), useValue: partoRepository },
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(CodigoIdentificacao), useValue: codigoRepository },
        { provide: getRepositoryToken(Pasto), useValue: pastoRepository },
      ],
    }).compile();

    service = module.get(PartoService);
  });

  it('grava o pasto em cada cria e cria uma movimentação por cria', async () => {
    await service.create('f1', 'u1', dto);

    const animaisCriados = manager.create.mock.calls.filter(([e]) => e === Animal);
    const movimentacoes = manager.create.mock.calls.filter(([e]) => e === MovimentacaoPasto);

    expect(animaisCriados).toHaveLength(2);
    animaisCriados.forEach(([, dados]) => expect(dados.pastoAtualId).toBe('p1'));
    expect(movimentacoes).toHaveLength(2);
    movimentacoes.forEach(([, dados]) =>
      expect(dados).toEqual(
        expect.objectContaining({ pastoId: 'p1', dataEntrada: '2026-10-27', dataSaida: null }),
      ),
    );
  });

  it('rejeita pasto de outra fazenda sem abrir transação', async () => {
    pastoRepository.findOneBy.mockResolvedValue({ id: 'p1', fazendaId: 'outra' });

    await expect(service.create('f1', 'u1', dto)).rejects.toThrow(NotFoundException);
    expect(partoRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejeita pasto inexistente', async () => {
    pastoRepository.findOneBy.mockResolvedValue(null);

    await expect(service.create('f1', 'u1', dto)).rejects.toThrow(NotFoundException);
    expect(partoRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('sem pasto: cria sem movimentação e sem consultar o pasto', async () => {
    const semPasto = { ...dto, pastoId: undefined } as unknown as CreatePartoDto;

    await service.create('f1', 'u1', semPasto);

    expect(pastoRepository.findOneBy).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalledWith(MovimentacaoPasto, expect.anything());
  });

  it('propaga o erro se a movimentação falhar dentro da transação', async () => {
    manager.save.mockImplementation(async (e: object) => {
      if ('dataEntrada' in e && 'pastoId' in e) throw new Error('falha na movimentação');
      return { id: 'gerado', ...e };
    });

    await expect(service.create('f1', 'u1', dto)).rejects.toThrow('falha na movimentação');
    expect(partoRepository.manager.transaction).toHaveBeenCalledTimes(1);
  });
});