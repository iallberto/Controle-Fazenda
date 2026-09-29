import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TratamentoService } from './tratamento.service';
import { Tratamento } from './entities/tratamento.entity';
import { Animal } from '../animal/entities/animal.entity';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('TratamentoService', () => {
  let service: TratamentoService;
  let tratamentoRepository: MockRepository;
  let animalRepository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TratamentoService,
        { provide: getRepositoryToken(Tratamento), useValue: createMockRepository() },
        { provide: getRepositoryToken(Animal), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<TratamentoService>(TratamentoService);
    tratamentoRepository = module.get(getRepositoryToken(Tratamento));
    animalRepository = module.get(getRepositoryToken(Animal));
  });

  it('deve calcular a proxima data prevista somando os dias de recorrencia', async () => {
    const fazendaId = 'fazenda-1';
    const dto = {
      animalId: 'animal-1',
      produto: 'Vermifugo',
      data: '2026-01-10',
      responsavel: 'Alberto',
      recorrenciaDias: 90,
    };

    animalRepository.findOneBy!.mockResolvedValue({ id: 'animal-1', fazendaId });
    tratamentoRepository.create!.mockImplementation((entrada) => entrada);
    tratamentoRepository.save!.mockImplementation((entrada) => Promise.resolve(entrada));

    const resultado = await service.create(fazendaId, dto as any);

    expect(resultado.proximaDataPrevista).toBe('2026-04-10');
  });

  it('deve deixar proximaDataPrevista nula quando nao ha recorrencia', async () => {
    const fazendaId = 'fazenda-1';
    const dto = {
      animalId: 'animal-1',
      produto: 'Vacina unica',
      data: '2026-01-10',
      responsavel: 'Alberto',
    };

    animalRepository.findOneBy!.mockResolvedValue({ id: 'animal-1', fazendaId });
    tratamentoRepository.create!.mockImplementation((entrada) => entrada);
    tratamentoRepository.save!.mockImplementation((entrada) => Promise.resolve(entrada));

    const resultado = await service.create(fazendaId, dto as any);

    expect(resultado.proximaDataPrevista).toBeNull();
  });
});