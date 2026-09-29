import { Test, TestingModule } from '@nestjs/testing';
import { CodigoIdentificacaoController } from './codigo-identificacao.controller';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';

describe('CodigoIdentificacaoController', () => {
  let controller: CodigoIdentificacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CodigoIdentificacaoController],
      providers: [CodigoIdentificacaoService],
    }).compile();

    controller = module.get<CodigoIdentificacaoController>(CodigoIdentificacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
