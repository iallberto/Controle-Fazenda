import { Test, TestingModule } from '@nestjs/testing';
import { VeterinarioController } from './veterinario.controller';
import { VeterinarioService } from './veterinario.service';

describe('VeterinarioController', () => {
  let controller: VeterinarioController;

  const mockVeterinarioService = {
    create: jest.fn(),
    findAll: jest.fn(),
    inativar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VeterinarioController],
      providers: [{ provide: VeterinarioService, useValue: mockVeterinarioService }],
    }).compile();

    controller = module.get<VeterinarioController>(VeterinarioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});