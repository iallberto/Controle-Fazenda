import { Test, TestingModule } from '@nestjs/testing';
import { RelatorioController } from './relatorio.controller';
import { RelatorioService } from './relatorio.service';

describe('RelatorioController', () => {
  let controller: RelatorioController;

  const mockService = {
    painelInicial: jest.fn(),
    nascimentosPorPeriodo: jest.fn(),
    natimortos: jest.fn(),
    obitosPorCausa: jest.fn(),
    tratamentosPorPeriodo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelatorioController],
      providers: [{ provide: RelatorioService, useValue: mockService }],
    }).compile();

    controller = module.get<RelatorioController>(RelatorioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});