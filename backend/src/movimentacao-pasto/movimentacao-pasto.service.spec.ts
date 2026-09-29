import { Test, TestingModule } from '@nestjs/testing';
import { MovimentacaoPastoService } from './movimentacao-pasto.service';

describe('MovimentacaoPastoService', () => {
  let service: MovimentacaoPastoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovimentacaoPastoService],
    }).compile();

    service = module.get<MovimentacaoPastoService>(MovimentacaoPastoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
