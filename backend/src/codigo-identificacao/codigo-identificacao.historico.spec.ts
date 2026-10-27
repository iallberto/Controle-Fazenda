import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { CodigoIdentificacao, StatusCodigo } from './entities/codigo-identificacao.entity';
import { HistoricoNumero } from './entities/historico-numero.entity';
import { Animal } from '../animal/entities/animal.entity';

describe('CodigoIdentificacaoService - histórico de número (M12)', () => {
  let service: CodigoIdentificacaoService;

  const manager = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const codigoRepository = {
    manager: { transaction: jest.fn() },
    findOneBy: jest.fn(),
  };
  const animalRepository = { findOne: jest.fn(), findOneBy: jest.fn() };
  const historicoRepository = { find: jest.fn(), findOne: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    manager.create.mockImplementation((_e: unknown, dados: object) => ({ ...dados }));
    manager.save.mockImplementation(async (e: unknown) => e);
    codigoRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    codigoRepository.findOneBy.mockResolvedValue(null);

    const module = await Test.createTestingModule({
      providers: [
        CodigoIdentificacaoService,
        { provide: getRepositoryToken(CodigoIdentificacao), useValue: codigoRepository },
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(HistoricoNumero), useValue: historicoRepository },
      ],
    }).compile();

    service = module.get(CodigoIdentificacaoService);
  });

  describe('reemitir', () => {
    it('grava o número anterior e o novo no histórico', async () => {
      animalRepository.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'f1', brinco: '42' });
      manager.findOne
        .mockResolvedValueOnce({ id: 'c42', animalId: 'a1', status: StatusCodigo.VINCULADO, numero: 42 })
        .mockResolvedValueOnce({ numero: 186 });

      await service.reemitir('f1', 'u1', { animalId: 'a1', motivo: 'brinco perdido' });

      expect(manager.create).toHaveBeenCalledWith(
        HistoricoNumero,
        expect.objectContaining({
          fazendaId: 'f1',
          animalId: 'a1',
          numeroAnterior: '42',
          numeroNovo: '187',
          motivo: 'brinco perdido',
          reemitidoPorId: 'u1',
        }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ numeroAnterior: '42', numeroNovo: '187' }),
      );
    });

    it('desativa o código antigo e nunca reaproveita o número', async () => {
      const codigoAntigo = { id: 'c42', animalId: 'a1', status: StatusCodigo.VINCULADO, numero: 42 };
      animalRepository.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'f1', brinco: '42' });
      manager.findOne
        .mockResolvedValueOnce(codigoAntigo)
        .mockResolvedValueOnce({ numero: 186 });

      const novo = await service.reemitir('f1', 'u1', { animalId: 'a1' });

      expect(codigoAntigo.status).toBe(StatusCodigo.DESATIVADO);
      expect(novo.numero).toBe(187);
      expect(novo.status).toBe(StatusCodigo.VINCULADO);
    });

    it('grava motivo nulo quando não informado', async () => {
      animalRepository.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'f1', brinco: '42' });
      manager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ numero: 10 });

      await service.reemitir('f1', 'u1', { animalId: 'a1' });

      expect(manager.create).toHaveBeenCalledWith(
        HistoricoNumero,
        expect.objectContaining({ motivo: null }),
      );
    });

    it('rejeita animal de outra fazenda e não grava nada', async () => {
      animalRepository.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'outra', brinco: '42' });

      await expect(
        service.reemitir('f1', 'u1', { animalId: 'a1' }),
      ).rejects.toThrow(NotFoundException);
      expect(codigoRepository.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('buscarPorNumero', () => {
    it('encontra o animal pelo número atual, sem aviso', async () => {
      const animal = { id: 'a1', fazendaId: 'f1', brinco: '187' };
      animalRepository.findOne.mockResolvedValue(animal);

      const resultado = await service.buscarPorNumero('f1', '187');

      expect(resultado).toEqual({ animal, numeroBuscado: '187', reemitido: false, aviso: null });
      expect(historicoRepository.findOne).not.toHaveBeenCalled();
    });

    it('aceita zeros à esquerda (0187)', async () => {
      animalRepository.findOne.mockResolvedValue({ id: 'a1', fazendaId: 'f1', brinco: '187' });

      await service.buscarPorNumero('f1', '0187');

      expect(animalRepository.findOne).toHaveBeenCalledWith({
        where: { fazendaId: 'f1', brinco: '187' },
      });
    });

    it('encontra pelo número antigo e avisa o número atual', async () => {
      animalRepository.findOne.mockResolvedValue(null);
      historicoRepository.findOne.mockResolvedValue({ animalId: 'a1', numeroAnterior: '42' });
      animalRepository.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'f1', brinco: '187' });

      const resultado = await service.buscarPorNumero('f1', '42');

      expect(resultado.reemitido).toBe(true);
      expect(resultado.animal.brinco).toBe('187');
      expect(resultado.aviso).toContain('#0042');
      expect(resultado.aviso).toContain('Agora é o #0187');
    });

    it('usa o número atual mesmo após reemissões encadeadas (42 → 187 → 203)', async () => {
      animalRepository.findOne.mockResolvedValue(null);
      historicoRepository.findOne.mockResolvedValue({ animalId: 'a1', numeroAnterior: '42' });
      animalRepository.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'f1', brinco: '203' });

      const resultado = await service.buscarPorNumero('f1', '42');

      expect(resultado.aviso).toContain('Agora é o #0203');
    });

    it('filtra o histórico pela fazenda do usuário', async () => {
      animalRepository.findOne.mockResolvedValue(null);
      historicoRepository.findOne.mockResolvedValue(null);

      await expect(service.buscarPorNumero('f1', '42')).rejects.toThrow(NotFoundException);

      expect(historicoRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fazendaId: 'f1', numeroAnterior: '42' },
        }),
      );
    });

    it('retorna 404 para número que nunca existiu', async () => {
      animalRepository.findOne.mockResolvedValue(null);
      historicoRepository.findOne.mockResolvedValue(null);

      await expect(service.buscarPorNumero('f1', '9999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listarHistoricoDoAnimal', () => {
    it('lista o histórico do animal, do mais recente ao mais antigo', async () => {
      animalRepository.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'f1' });
      historicoRepository.find.mockResolvedValue([{ numeroAnterior: '187' }, { numeroAnterior: '42' }]);

      const lista = await service.listarHistoricoDoAnimal('f1', 'a1');

      expect(lista).toHaveLength(2);
      expect(historicoRepository.find).toHaveBeenCalledWith({
        where: { fazendaId: 'f1', animalId: 'a1' },
        order: { reemitidoEm: 'DESC' },
      });
    });

    it('rejeita animal de outra fazenda', async () => {
      animalRepository.findOneBy.mockResolvedValue({ id: 'a1', fazendaId: 'outra' });

      await expect(service.listarHistoricoDoAnimal('f1', 'a1')).rejects.toThrow(
        NotFoundException,
      );
      expect(historicoRepository.find).not.toHaveBeenCalled();
    });
  });
});