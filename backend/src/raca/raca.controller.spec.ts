import { Test, TestingModule } from '@nestjs/testing';
import { RacaController } from './raca.controller';
import { RacaService } from './raca.service';

describe('RacaController', () => {
  let controller: RacaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RacaController],
      providers: [RacaService],
    }).compile();

    controller = module.get<RacaController>(RacaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
