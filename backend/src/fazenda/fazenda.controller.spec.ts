import { Test, TestingModule } from '@nestjs/testing';
import { FazendaController } from './fazenda.controller';
import { FazendaService } from './fazenda.service';
import { AcessoModulosService } from '../modulos/acesso/acesso-modulos.service';

describe('FazendaController', () => {
  let controller: FazendaController;

  const mockFazendaService = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockAcessoModulos = { listar: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FazendaController],
      providers: [
        { provide: FazendaService, useValue: mockFazendaService },
        { provide: AcessoModulosService, useValue: mockAcessoModulos },
      ],
    }).compile();

    controller = module.get<FazendaController>(FazendaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /fazenda/modulos usa a fazenda do token (FR-013)', async () => {
    mockAcessoModulos.listar.mockResolvedValue([]);
    await controller.modulos({ sub: 'u1', fazendaId: 'f1', papel: 'FUNCIONARIO' });
    expect(mockAcessoModulos.listar).toHaveBeenCalledWith('f1');
  });
});