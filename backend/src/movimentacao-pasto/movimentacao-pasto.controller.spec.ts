import { Test, TestingModule } from '@nestjs/testing';
import { MovimentacaoPastoController } from './movimentacao-pasto.controller';
import { MovimentacaoPastoService } from './movimentacao-pasto.service';

describe('MovimentacaoPastoController', () => {
  let controller: MovimentacaoPastoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovimentacaoPastoController],
      providers: [MovimentacaoPastoService],
    }).compile();

    controller = module.get<MovimentacaoPastoController>(MovimentacaoPastoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
