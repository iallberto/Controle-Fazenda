import { Test, TestingModule } from '@nestjs/testing';
import { CodigoIdentificacaoController } from './codigo-identificacao.controller';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';

describe('CodigoIdentificacaoController', () => {
  let controller: CodigoIdentificacaoController;

  const mockCodigoService = {
    gerarLote: jest.fn(),
    buscarPorCodigo: jest.fn(),
    vincular: jest.fn(),
    reemitir: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CodigoIdentificacaoController],
      providers: [{ provide: CodigoIdentificacaoService, useValue: mockCodigoService }],
    }).compile();

    controller = module.get<CodigoIdentificacaoController>(CodigoIdentificacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});