import { Test, TestingModule } from '@nestjs/testing';
import { PartoService } from './parto.service';

describe('PartoService', () => {
  let service: PartoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartoService],
    }).compile();

    service = module.get<PartoService>(PartoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
