import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { Animal, CategoriaAnimal, Sexo } from './entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { CreateAnimalDto } from './dto/create-animal.dto';

describe('AnimalService - pasto no cadastro (M9)', () => {
  let service: AnimalService;

  const manager = { create: jest.fn(), save: jest.fn() };
  const animalRepository = { manager: { transaction: jest.fn() }, findOneBy: jest.fn() };
  const codigoRepository = { findOneBy: jest.fn() };
  const pastoRepository = { findOneBy: jest.fn() };

  const dto = {
    codigoId: 'c1',
    sexo: Sexo.M,
    categoria: CategoriaAnimal.BEZERRO,
    origem: 'NASCIDO_FAZENDA',
    dataNascimento: '2026-10-27',
    pastoAtualId: 'p1',
  } as unknown as CreateAnimalDto;

  beforeEach(async () => {
    jest.resetAllMocks();
    manager.create.mockImplementation((_e: unknown, dados: object) => ({ ...dados }));
    manager.save.mockImplementation(async (e: object) => ({ id: 'novo', ...e }));
    animalRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    codigoRepository.findOneBy.mockResolvedValue({
      id: 'c1',
      fazendaId: 'f1',
      numero: 7,
      status: StatusCodigo.DISPONIVEL,
    });
    pastoRepository.findOneBy.mockResolvedValue({ id: 'p1', fazendaId: 'f1' });

    const module = await Test.createTestingModule({
      providers: [
        AnimalService,
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(CodigoIdentificacao), useValue: codigoRepository },
        { provide: getRepositoryToken(Pasto), useValue: pastoRepository },
      ],
    }).compile();

    service = module.get(AnimalService);
  });

  it('cria a movimentação inicial quando o animal nasce com pasto', async () => {
    await service.create('f1', 'u1', dto);

    expect(manager.create).toHaveBeenCalledWith(
      MovimentacaoPasto,
      expect.objectContaining({
        animalId: 'novo',
        pastoId: 'p1',
        dataEntrada: '2026-10-27',
        dataSaida: null,
      }),
    );
  });

  it('rejeita pasto de outra fazenda sem abrir transação', async () => {
    pastoRepository.findOneBy.mockResolvedValue({ id: 'p1', fazendaId: 'outra' });

    await expect(service.create('f1', 'u1', dto)).rejects.toThrow(NotFoundException);
    expect(animalRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejeita pasto inexistente', async () => {
    pastoRepository.findOneBy.mockResolvedValue(null);

    await expect(service.create('f1', 'u1', dto)).rejects.toThrow(NotFoundException);
    expect(animalRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('não consulta pasto nem cria movimentação quando não há pasto', async () => {
    const semPasto = { ...dto, pastoAtualId: undefined } as unknown as CreateAnimalDto;

    await service.create('f1', 'u1', semPasto);

    expect(pastoRepository.findOneBy).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalledWith(MovimentacaoPasto, expect.anything());
  });

  it('propaga o erro se a movimentação falhar dentro da transação', async () => {
    manager.save.mockImplementation(async (e: object) => {
      if ('dataEntrada' in e) throw new Error('falha na movimentação');
      return { id: 'novo', ...e };
    });

    await expect(service.create('f1', 'u1', dto)).rejects.toThrow('falha na movimentação');
    expect(animalRepository.manager.transaction).toHaveBeenCalledTimes(1);
  });
});