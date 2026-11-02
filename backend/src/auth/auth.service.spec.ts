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
      mockUsuarioRepository.findOneBy.mockResolvedValue(null);
      const dto = { email: 'alguem@teste.com', senha: 'errada' };

      for (let i = 0; i < 5; i++) {
        await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      }
      await expect(service.login(dto)).rejects.toMatchObject({ status: 429 });
    });

    it('rejeita usuario desativado mesmo com a senha certa', async () => {
      const senhaHash = await bcrypt.hash('certa', 4);
      mockUsuarioRepository.findOneBy.mockResolvedValue({ id: 'u1', senhaHash, ativo: false });

      await expect(service.login({ email: 'u@teste.com', senha: 'certa' })).rejects.toThrow(
        'desativado',
      );
    });
  });
});
