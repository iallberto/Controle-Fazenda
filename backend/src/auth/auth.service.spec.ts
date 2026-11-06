import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { Usuario } from '../usuario/entities/usuario.entity';
import { SessaoSuporte } from '../modulos/admin/entities/sessao-suporte.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsuarioRepository = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockSessaoRepository = { update: jest.fn() };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(SessaoSuporte), useValue: mockSessaoRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('bloqueia o e-mail depois de 5 tentativas erradas', async () => {
      mockUsuarioRepository.findOne.mockResolvedValue(null);
      const dto = { email: 'alguem@teste.com', senha: 'errada' };

      for (let i = 0; i < 5; i++) {
        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      }
      await expect(service.login(dto)).rejects.toMatchObject({ status: 429 });
    });

    it('rejeita usuario desativado mesmo com a senha certa', async () => {
      const senhaHash = await bcrypt.hash('certa', 4);
      mockUsuarioRepository.findOne.mockResolvedValue({ id: 'u1', senhaHash, ativo: false });

      await expect(service.login({ email: 'u@teste.com', senha: 'certa' })).rejects.toThrow(
        'desativado',
      );
    });

    it('rejeita usuario de fazenda suspensa com 403 ACESSO_SUSPENSO (spec 002, FR-026)', async () => {
      const senhaHash = await bcrypt.hash('certa', 4);
      mockUsuarioRepository.findOne.mockResolvedValue({
        id: 'u1',
        senhaHash,
        ativo: true,
        fazenda: { suspensa: true },
      });

      await expect(service.login({ email: 'u@teste.com', senha: 'certa' })).rejects.toMatchObject({
        status: 403,
        response: expect.objectContaining({ codigo: 'ACESSO_SUSPENSO' }),
      });
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('login devolve precisaTrocarSenha (spec 007, FR-004)', async () => {
      const senhaHash = await bcrypt.hash('provisoria', 4);
      mockUsuarioRepository.findOne.mockResolvedValue({
        id: 'u1', fazendaId: 'f1', papel: 'FUNCIONARIO', senhaHash, ativo: true,
        fazenda: { suspensa: false }, precisaTrocarSenha: true,
      });
      mockJwtService.sign.mockReturnValue('token');
      const r = await service.login({ email: 'u@teste.com', senha: 'provisoria' });
      expect(r.usuario.precisaTrocarSenha).toBe(true);
    });
  });

  describe('trocarSenha (spec 007, FR-001, FR-002, FR-005)', () => {
    let usuario: Record<string, unknown>;

    beforeEach(async () => {
      jest.clearAllMocks();
      usuario = {
        id: 'u1', fazendaId: 'f1', papel: 'FUNCIONARIO', ativo: true,
        senhaHash: await bcrypt.hash('atual-123', 4), precisaTrocarSenha: true, senhaAlteradaEm: null,
      };
      mockUsuarioRepository.findOneBy.mockResolvedValue(usuario);
      (mockUsuarioRepository as Record<string, jest.Mock>).save = jest.fn(async (u) => u);
      mockJwtService.sign.mockReturnValue('token-novo');
    });

    it('com a senha atual certa: grava a nova, desliga a provisória, marca a hora e devolve token novo', async () => {
      const r = await service.trocarSenha('u1', { senhaAtual: 'atual-123', novaSenha: 'nova-senha-9' });
      expect(r.accessToken).toBe('token-novo');
      expect(r.usuario.precisaTrocarSenha).toBe(false);
      expect(usuario.senhaAlteradaEm).toBeInstanceOf(Date);
      expect(await bcrypt.compare('nova-senha-9', usuario.senhaHash as string)).toBe(true);
    });

    it('senha atual errada ou nova igual à atual: 400 e nada gravado', async () => {
      await expect(service.trocarSenha('u1', { senhaAtual: 'errada', novaSenha: 'nova-senha-9' })).rejects.toMatchObject({ status: 400 });
      await expect(service.trocarSenha('u1', { senhaAtual: 'atual-123', novaSenha: 'atual-123' })).rejects.toMatchObject({ status: 400 });
      expect((mockUsuarioRepository as Record<string, jest.Mock>).save).not.toHaveBeenCalled();
    });
  });

  describe('suporte (spec 008)', () => {
    it('usuário suporte não entra por senha, mesmo com a senha certa', async () => {
      const senhaHash = await bcrypt.hash('qualquer', 4);
      mockUsuarioRepository.findOne.mockResolvedValue({
        id: 'sup1', senhaHash, ativo: true, suporte: true, fazenda: { suspensa: false },
      });
      await expect(service.login({ email: 'sup@suporte.invalid', senha: 'qualquer' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('encerrar suporte grava a saída da sessão aberta', async () => {
      await service.encerrarSuporte('s1');
      expect(mockSessaoRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's1' }),
        expect.objectContaining({ saidaEm: expect.any(Date) }),
      );
    });
  });
});

