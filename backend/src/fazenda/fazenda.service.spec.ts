import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { FazendaService } from './fazenda.service';
import { Fazenda } from './entities/fazenda.entity';

type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

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

  it('deve atualizar a fazenda informada', async () => {
    const fazenda = { id: 'fazenda-1', nome: 'Antiga' };
    repository.findOneBy!.mockResolvedValue(fazenda);
    repository.save!.mockImplementation(async (f) => f);

    const resultado = await service.update('fazenda-1', { nome: 'Nova' });

    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'fazenda-1' });
    expect(resultado.nome).toBe('Nova');
  });

  it('deve lançar NotFound quando a fazenda não existe', async () => {
    repository.findOneBy!.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow('não encontrada');
  });
});
