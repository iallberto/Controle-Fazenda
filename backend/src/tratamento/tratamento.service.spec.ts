import { Test, TestingModule } from '@nestjs/testing';
import { TratamentoService } from './tratamento.service';

describe('TratamentoService', () => {
  let service: TratamentoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TratamentoService],
    }).compile();

    service = module.get<TratamentoService>(TratamentoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
