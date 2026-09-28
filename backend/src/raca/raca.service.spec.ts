import { Test, TestingModule } from '@nestjs/testing';
import { RacaService } from './raca.service';

describe('RacaService', () => {
  let service: RacaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RacaService],
    }).compile();

    service = module.get<RacaService>(RacaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
