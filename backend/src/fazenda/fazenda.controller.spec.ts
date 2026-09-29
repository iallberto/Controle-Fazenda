import { Test, TestingModule } from '@nestjs/testing';
import { FazendaController } from './fazenda.controller';
import { FazendaService } from './fazenda.service';

describe('FazendaController', () => {
  let controller: FazendaController;

  const mockFazendaService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FazendaController],
      providers: [{ provide: FazendaService, useValue: mockFazendaService }],
    }).compile();

    controller = module.get<FazendaController>(FazendaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});