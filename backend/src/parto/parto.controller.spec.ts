import { Test, TestingModule } from '@nestjs/testing';
import { PartoController } from './parto.controller';
import { PartoService } from './parto.service';

describe('PartoController', () => {
  let controller: PartoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartoController],
      providers: [PartoService],
    }).compile();

    controller = module.get<PartoController>(PartoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
