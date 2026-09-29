import { Test, TestingModule } from '@nestjs/testing';
import { TratamentoController } from './tratamento.controller';
import { TratamentoService } from './tratamento.service';

describe('TratamentoController', () => {
  let controller: TratamentoController;

  const mockTratamentoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TratamentoController],
      providers: [{ provide: TratamentoService, useValue: mockTratamentoService }],
    }).compile();

    controller = module.get<TratamentoController>(TratamentoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});