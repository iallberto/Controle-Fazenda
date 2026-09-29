import { Test, TestingModule } from '@nestjs/testing';
import { ConfiguracaoController } from './configuracao.controller';
import { ConfiguracaoService } from './configuracao.service';

describe('ConfiguracaoController', () => {
  let controller: ConfiguracaoController;

  const mockService = {
    obterOuCriar: jest.fn(),
    atualizarPreferencias: jest.fn(),
    atualizarValorArroba: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfiguracaoController],
      providers: [{ provide: ConfiguracaoService, useValue: mockService }],
    }).compile();

    controller = module.get<ConfiguracaoController>(ConfiguracaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});