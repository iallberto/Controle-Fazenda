import { Test, TestingModule } from '@nestjs/testing';
import { ConfiguracaoService } from './configuracao.service';

describe('ConfiguracaoService', () => {
  let service: ConfiguracaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfiguracaoService],
    }).compile();

    service = module.get<ConfiguracaoService>(ConfiguracaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
