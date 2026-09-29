import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsuarioService } from './usuario.service';
import { Usuario, PapelUsuario } from './entities/usuario.entity';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('UsuarioService', () => {
  let service: UsuarioService;
  let repository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioService,
        { provide: getRepositoryToken(Usuario), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<UsuarioService>(UsuarioService);
    repository = module.get(getRepositoryToken(Usuario));
  });

  describe('create', () => {
    it('deve gerar hash da senha e nunca salvar a senha em texto puro', async () => {
      const fazendaId = 'fazenda-1';
      const dto = {
        nome: 'Alberto',
        email: 'alberto@teste.com',
        senha: '123456',
        papel: PapelUsuario.DONO,
      };

      repository.findOneBy!.mockResolvedValue(null);
      repository.create!.mockImplementation((entrada) => entrada);
      repository.save!.mockImplementation((entrada) => Promise.resolve({ id: 'usuario-1', ...entrada }));

      const resultado = await service.create(fazendaId, dto as any);

      const argumentoDoCreate = repository.create!.mock.calls[0][0];
      expect(argumentoDoCreate.senhaHash).toBeDefined();
      expect(argumentoDoCreate.senhaHash).not.toBe(dto.senha);

      const senhaConfere = await bcrypt.compare(dto.senha, argumentoDoCreate.senhaHash);
      expect(senhaConfere).toBe(true);

      expect(resultado).not.toHaveProperty('senha');
    });

    it('deve lançar ConflictException quando o e-mail já existe', async () => {
      repository.findOneBy!.mockResolvedValue({ id: 'existente' });

      const dto = {
        nome: 'Outro',
        email: 'repetido@teste.com',
        senha: '123456',
        papel: PapelUsuario.FUNCIONARIO,
      };

      await expect(service.create('fazenda-1', dto as any)).rejects.toThrow(ConflictException);
    });
  });
});