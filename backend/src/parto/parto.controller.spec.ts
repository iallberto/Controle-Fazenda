import { Test, TestingModule } from '@nestjs/testing';
import { PartoController } from './parto.controller';
import { PartoService } from './parto.service';

describe('PartoController', () => {
  let controller: PartoController;

  const mockPartoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PartoController],
      providers: [{ provide: PartoService, useValue: mockPartoService }],
    }).compile();

    controller = module.get<PartoController>(PartoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});