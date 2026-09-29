import { Test, TestingModule } from '@nestjs/testing';
import { ConfiguracaoController } from './configuracao.controller';

describe('ConfiguracaoController', () => {
  let controller: ConfiguracaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfiguracaoController],
    }).compile();

    controller = module.get<ConfiguracaoController>(ConfiguracaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
