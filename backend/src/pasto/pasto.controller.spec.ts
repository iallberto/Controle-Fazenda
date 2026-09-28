import { Test, TestingModule } from '@nestjs/testing';
import { PastoController } from './pasto.controller';
import { PastoService } from './pasto.service';

describe('PastoController', () => {
  let controller: PastoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PastoController],
      providers: [PastoService],
    }).compile();

    controller = module.get<PastoController>(PastoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
