import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InseminacaoService } from './inseminacao.service';
import { SituacaoService } from './situacao.service';
import { Semen } from './entities/semen.entity';
import { Inseminacao, TipoInseminacao } from './entities/inseminacao.entity';
import {
  Animal,
  CategoriaAnimal,
  Sexo,
  StatusAnimal,
} from '../animal/entities/animal.entity';
import { Raca } from '../raca/entities/raca.entity';
import { AplicadoPorTipo } from '../tratamento/entities/tratamento.entity';
import { TratamentoService } from '../tratamento/tratamento.service';

describe('InseminacaoService', () => {
  let service: InseminacaoService;

  // Baixa atômica: o query builder devolve quantas linhas o UPDATE afetou
  const execute = jest.fn();
  const queryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute,
  };
  const manager = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  const semenRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    increment: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const inseminacaoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const animalRepository = { findOneBy: jest.fn() };
  const racaRepository = { findOne: jest.fn() };
  const situacaoService = { motivoInaptidao: jest.fn() };
  const tratamentoService = { validarAplicador: jest.fn() };

  const femea = {
    id: 'v1',
    fazendaId: 'f1',
    brinco: '12',
    sexo: Sexo.F,
    status: StatusAnimal.ATIVO,
    categoria: CategoriaAnimal.MATRIZ,
    statusReprodutivo: null,
  };
  const dto = {
    femeaId: 'v1',
    data: '2026-11-03',
    tipo: TipoInseminacao.IATF,
    semenId: 's1',
    aplicadoPorTipo: AplicadoPorTipo.USUARIO,
    aplicadoPorUsuarioId: 'u1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    inseminacaoRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    animalRepository.findOneBy.mockResolvedValue({ ...femea });
    situacaoService.motivoInaptidao.mockResolvedValue(null);
    semenRepository.findOne.mockResolvedValue({
      id: 's1',
      fazendaId: 'f1',
      doses: 10,
    });
    tratamentoService.validarAplicador.mockResolvedValue(undefined);
    execute.mockResolvedValue({ affected: 1 });
    manager.create.mockImplementation(
      (_entidade: unknown, dados: object) => dados,
    );
    manager.save.mockImplementation(async (dados: object) => ({
      id: 'i1',
      ...dados,
    }));
    inseminacaoRepository.findOne.mockResolvedValue({
      id: 'i1',
      semenId: 's1',
      femea: { fazendaId: 'f1' },
      data: '2026-11-03',
      tipo: TipoInseminacao.IA,
      cancelamento: { cancelado: false },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InseminacaoService,
        { provide: getRepositoryToken(Semen), useValue: semenRepository },
        {
          provide: getRepositoryToken(Inseminacao),
          useValue: inseminacaoRepository,
        },
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(Raca), useValue: racaRepository },
        { provide: SituacaoService, useValue: situacaoService },
        { provide: TratamentoService, useValue: tratamentoService },
      ],
    }).compile();

    service = module.get(InseminacaoService);
  });

  describe('registrar', () => {
    it('baixa uma dose do sêmen com UPDATE condicional e grava a inseminação', async () => {
      const inseminacao = await service.registrar('f1', 'u1', dto);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND doses > 0',
        { id: 's1' },
      );
      expect(inseminacao).toMatchObject({
        femeaId: 'v1',
        semenId: 's1',
        tipo: TipoInseminacao.IATF,
        aplicadoPorUsuarioId: 'u1',
        aplicadoPorVeterinarioId: null,
        criadoPorId: 'u1',
      });
    });

    it('sêmen sem dose → 409 e nada é gravado (FR-011)', async () => {
      execute.mockResolvedValue({ affected: 0 });

      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('recusa fêmea não apta, com o motivo', async () => {
      situacaoService.motivoInaptidao.mockResolvedValue('já está prenhe');

      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        'já está prenhe',
      );
      expect(execute).not.toHaveBeenCalled();
    });

    it('recusa macho e animal de outra fazenda', async () => {
      animalRepository.findOneBy.mockResolvedValue({ ...femea, sexo: Sexo.M });
      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        BadRequestException,
      );

      animalRepository.findOneBy.mockResolvedValue({
        ...femea,
        fazendaId: 'f2',
      });
      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sêmen de outra fazenda → 404', async () => {
      semenRepository.findOne.mockResolvedValue({ id: 's1', fazendaId: 'f2' });
      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('valida o aplicador na fazenda', async () => {
      tratamentoService.validarAplicador.mockRejectedValue(
        new NotFoundException('Usuário aplicador não encontrado'),
      );
      await expect(service.registrar('f1', 'u1', dto)).rejects.toThrow(
        'aplicador',
      );
      expect(tratamentoService.validarAplicador).toHaveBeenCalledWith(
        'f1',
        AplicadoPorTipo.USUARIO,
        'u1',
        undefined,
      );
    });
  });

  describe('sêmen', () => {
    it('entrada de doses soma ao estoque (FR-012)', async () => {
      await service.entradaDoses('f1', 'u1', 's1', { doses: 5 });
      expect(semenRepository.increment).toHaveBeenCalledWith(
        { id: 's1' },
        'doses',
        5,
      );
    });

    it('exclui sêmen nunca usado', async () => {
      inseminacaoRepository.count.mockResolvedValue(0);
      await service.excluirSemen('f1', 's1');
      expect(semenRepository.delete).toHaveBeenCalledWith({ id: 's1' });
    });

    it('sêmen já usado não é excluído → 409', async () => {
      inseminacaoRepository.count.mockResolvedValue(2);
      await expect(service.excluirSemen('f1', 's1')).rejects.toThrow(
        ConflictException,
      );
      expect(semenRepository.delete).not.toHaveBeenCalled();
    });

    it('raça de outra fazenda → 404 no cadastro', async () => {
      racaRepository.findOne.mockResolvedValue(null);
      await expect(
        service.cadastrarSemen('f1', 'u1', {
          nomeTouro: 'Netuno',
          racaId: 'r9',
          doses: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelar e editar (dono)', () => {
    it('cancelar marca o registro e devolve a dose', async () => {
      await service.cancelar('f1', 'dono', 'i1', ' errei a vaca ');

      expect(manager.update).toHaveBeenCalledWith(
        Inseminacao,
        { id: 'i1' },
        expect.objectContaining({
          cancelamento: expect.objectContaining({
            cancelado: true,
            canceladoPorId: 'dono',
            motivoCancelamento: 'errei a vaca',
          }),
        }),
      );
      expect(manager.increment).toHaveBeenCalledWith(
        Semen,
        { id: 's1' },
        'doses',
        1,
      );
    });

    it('não cancela duas vezes', async () => {
      inseminacaoRepository.findOne.mockResolvedValue({
        id: 'i1',
        semenId: 's1',
        femea: { fazendaId: 'f1' },
        cancelamento: { cancelado: true },
      });
      await expect(
        service.cancelar('f1', 'dono', 'i1', 'motivo'),
      ).rejects.toThrow(BadRequestException);
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('trocar o sêmen baixa do novo e devolve ao antigo', async () => {
      semenRepository.findOne.mockResolvedValue({ id: 's2', fazendaId: 'f1' });

      await service.editar('f1', 'dono', 'i1', { semenId: 's2' });

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND doses > 0',
        { id: 's2' },
      );
      expect(manager.increment).toHaveBeenCalledWith(
        Semen,
        { id: 's1' },
        'doses',
        1,
      );
      expect(manager.update).toHaveBeenCalledWith(
        Inseminacao,
        { id: 'i1' },
        expect.objectContaining({ semenId: 's2', atualizadoPorId: 'dono' }),
      );
    });

    it('inseminação de outra fazenda → 404', async () => {
      inseminacaoRepository.findOne.mockResolvedValue({
        id: 'i1',
        femea: { fazendaId: 'f2' },
        cancelamento: { cancelado: false },
      });
      await expect(
        service.cancelar('f1', 'dono', 'i1', 'motivo'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
