import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FazendaService } from './fazenda.service';
import { Fazenda } from './entities/fazenda.entity';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('FazendaService', () => {
  let service: FazendaService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FazendaService,
        { provide: getRepositoryToken(Fazenda), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<FazendaService>(FazendaService);
    repository = module.get(getRepositoryToken(Fazenda));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('deve criar uma fazenda', async () => {
    const dto = { nome: 'Fazenda Teste' };
    repository.create!.mockReturnValue(dto);
    repository.save!.mockResolvedValue({ id: 'fazenda-1', ...dto });

    const resultado = await service.create(dto as any);

    expect(repository.save).toHaveBeenCalled();
    expect(resultado).toEqual({ id: 'fazenda-1', ...dto });
  });
});