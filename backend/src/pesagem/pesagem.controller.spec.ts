import { Test, TestingModule } from '@nestjs/testing';
import { PesagemController } from './pesagem.controller';
import { PesagemService } from './pesagem.service';

describe('PesagemController', () => {
  let controller: PesagemController;

  const mockPesagemService = {
    create: jest.fn(),
    findAllPorAnimal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PesagemController],
      providers: [{ provide: PesagemService, useValue: mockPesagemService }],
    }).compile();

    controller = module.get<PesagemController>(PesagemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});