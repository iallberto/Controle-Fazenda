import { Test, TestingModule } from '@nestjs/testing';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';

describe('CodigoIdentificacaoService', () => {
  let service: CodigoIdentificacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodigoIdentificacaoService],
    }).compile();

    service = module.get<CodigoIdentificacaoService>(CodigoIdentificacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
