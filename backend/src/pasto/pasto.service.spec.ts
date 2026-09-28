import { Test, TestingModule } from '@nestjs/testing';
import { PastoService } from './pasto.service';

describe('PastoService', () => {
  let service: PastoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PastoService],
    }).compile();

    service = module.get<PastoService>(PastoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
