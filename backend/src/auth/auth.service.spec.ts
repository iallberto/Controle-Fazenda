import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { Usuario } from '../usuario/entities/usuario.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsuarioRepository = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

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
  });
});
