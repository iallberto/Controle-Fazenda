import { Test, TestingModule } from '@nestjs/testing';
import { RacaController } from './raca.controller';
import { RacaService } from './raca.service';

describe('RacaController', () => {
  let controller: RacaController;

  const mockRacaService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RacaController],
      providers: [{ provide: RacaService, useValue: mockRacaService }],
    }).compile();

    controller = module.get<RacaController>(RacaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});