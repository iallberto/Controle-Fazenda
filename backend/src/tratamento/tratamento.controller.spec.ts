import { Test, TestingModule } from '@nestjs/testing';
import { TratamentoController } from './tratamento.controller';
import { TratamentoService } from './tratamento.service';

describe('TratamentoController', () => {
  let controller: TratamentoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TratamentoController],
      providers: [TratamentoService],
    }).compile();

    controller = module.get<TratamentoController>(TratamentoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
