import { Test, TestingModule } from '@nestjs/testing';
import { PastoController } from './pasto.controller';
import { PastoService } from './pasto.service';

describe('PastoController', () => {
  let controller: PastoController;

  const mockPastoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PastoController],
      providers: [{ provide: PastoService, useValue: mockPastoService }],
    }).compile();

    controller = module.get<PastoController>(PastoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});