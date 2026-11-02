import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsuarioService } from './usuario.service';
import { Usuario, PapelUsuario } from './entities/usuario.entity';

describe('UsuarioService', () => {
  let service: UsuarioService;
  let repository: Partial<Record<keyof Repository<Usuario>, jest.Mock>>;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioService,
        { provide: getRepositoryToken(Usuario), useValue: repository },
      ],
    }).compile();

    service = module.get<UsuarioService>(UsuarioService);
  });

  describe('create', () => {
    it('deve gerar hash da senha, registrar quem criou e nunca salvar a senha em texto puro', async () => {
      const fazendaId = 'fazenda-1';
      const usuarioLogadoId = 'dono-1';
      const dto = {
        nome: 'Funcionario',
        email: 'funcionario@teste.com',
        senha: '123456',
        papel: PapelUsuario.FUNCIONARIO,
      };

      repository.findOneBy!.mockResolvedValue(null);
      repository.create!.mockImplementation((entrada) => entrada);
      repository.save!.mockImplementation((entrada) => Promise.resolve({ id: 'usuario-2', ...entrada }));

      const resultado = await service.create(fazendaId, usuarioLogadoId, dto as any);

      const argumentoDoCreate = repository.create!.mock.calls[0][0];
      expect(argumentoDoCreate.senhaHash).toBeDefined();
      expect(argumentoDoCreate.senhaHash).not.toBe(dto.senha);
      expect(argumentoDoCreate.criadoPorId).toBe(usuarioLogadoId);

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

      await expect(service.create('fazenda-1', 'dono-1', dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('update e alterarAtivo', () => {
    const dono = { id: 'dono-1', fazendaId: 'fazenda-1', email: 'dono@teste.com', papel: PapelUsuario.DONO, ativo: true };

    beforeEach(() => {
      repository.save!.mockImplementation(async (u) => u);
    });

    it('rejeita trocar para um e-mail que ja existe', async () => {
      repository.findOneBy!
        .mockResolvedValueOnce({ ...dono })
        .mockResolvedValueOnce({ id: 'outro' });

      await expect(
        service.update('fazenda-1', 'dono-1', { email: 'outro@teste.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('nao deixa rebaixar o unico dono ativo', async () => {
      repository.findOneBy!.mockResolvedValue({ ...dono });
      repository.find!.mockResolvedValue([dono]);

      await expect(
        service.update('fazenda-1', 'dono-1', { papel: PapelUsuario.FUNCIONARIO }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nao deixa o usuario desativar a si mesmo', async () => {
      repository.findOneBy!.mockResolvedValue({ ...dono });

      await expect(service.alterarAtivo('fazenda-1', 'dono-1', 'dono-1', false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('desativa um funcionario', async () => {
      repository.findOneBy!.mockResolvedValue({
        id: 'func-1', fazendaId: 'fazenda-1', papel: PapelUsuario.FUNCIONARIO, ativo: true,
      });

      const resultado = await service.alterarAtivo('fazenda-1', 'dono-1', 'func-1', false);

      expect(resultado.ativo).toBe(false);
    });
  });
});
