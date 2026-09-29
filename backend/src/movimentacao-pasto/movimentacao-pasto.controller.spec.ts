import { Test, TestingModule } from '@nestjs/testing';
import { MovimentacaoPastoController } from './movimentacao-pasto.controller';
import { MovimentacaoPastoService } from './movimentacao-pasto.service';

describe('MovimentacaoPastoController', () => {
  let controller: MovimentacaoPastoController;

  const mockService = {
    mover: jest.fn(),
    historico: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovimentacaoPastoController],
      providers: [{ provide: MovimentacaoPastoService, useValue: mockService }],
    }).compile();

    controller = module.get<MovimentacaoPastoController>(MovimentacaoPastoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});