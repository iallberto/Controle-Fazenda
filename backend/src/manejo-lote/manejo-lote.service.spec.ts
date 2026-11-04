import { ganchosRebanho } from '../common/ganchos-rebanho';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ManejoLoteService } from './manejo-lote.service';
import { SessaoManejo } from './entities/sessao-manejo.entity';
import { SessaoManejoExcecao } from './entities/sessao-manejo-excecao.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import {
  Tratamento,
  AplicadoPorTipo,
} from '../tratamento/entities/tratamento.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { TratamentoService } from '../tratamento/tratamento.service';

describe('ManejoLoteService', () => {
  let service: ManejoLoteService;

  const manager = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };
  const animalRepository = {
    find: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const pastoRepository = { findOneBy: jest.fn() };
  const sessaoRepository = { find: jest.fn() };
  const tratamentoService = {
    validarAplicador: jest.fn(),
    calcularProximaData: jest.fn(),
  };

  // Pasto 1 tem três animais; o 3 já está no pasto 2
  const grupo = [
    { id: 'a10', brinco: '10', pastoAtualId: 'p1' },
    { id: 'a2', brinco: '2', pastoAtualId: 'p1' },
    { id: 'a3', brinco: '3', pastoAtualId: 'p2' },
  ];

  beforeEach(async () => {
    jest.resetAllMocks();
    // Gancho da reprodução: sem estações abertas nos testes
    manager.find.mockResolvedValue([]);
    ganchosRebanho.limpar();
    manager.insert.mockImplementation((_e: unknown, linhas: unknown[]) =>
      Promise.resolve({
        identifiers: (Array.isArray(linhas) ? linhas : [linhas]).map((_, i) => ({
          id: `id-${i}`,
        })),
      }),
    );
    animalRepository.manager.transaction.mockImplementation(
      (cb: (m: typeof manager) => unknown) => cb(manager),
    );
    animalRepository.find.mockResolvedValue(
      grupo.map((animal) => ({ ...animal })),
    );
    pastoRepository.findOneBy.mockImplementation(
      async ({ id }: { id: string }) => ({
        id,
        fazendaId: 'f1',
      }),
    );
    manager.create.mockImplementation(
      (_entidade: unknown, dados: object) => dados,
    );
    manager.save.mockImplementation(async (dados: object) => ({
      id: 'sessao-1',
      ...dados,
    }));
    tratamentoService.calcularProximaData.mockReturnValue('2026-12-04');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManejoLoteService,
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(Pasto), useValue: pastoRepository },
        {
          provide: getRepositoryToken(SessaoManejo),
          useValue: sessaoRepository,
        },
        { provide: TratamentoService, useValue: tratamentoService },
      ],
    }).compile();

    service = module.get(ManejoLoteService);
  });

  const tratamentoDto = {
    pastoId: 'p1',
    animalIds: ['a10', 'a2'],
    excecoes: [{ animalId: 'a3', motivo: 'Prenhez avançada' }],
    produto: 'Vacina aftosa',
    data: '2026-11-04',
    recorrenciaDias: 30,
    aplicadoPorTipo: AplicadoPorTipo.USUARIO,
    aplicadoPorUsuarioId: 'u1',
  };

  describe('listarGrupo', () => {
    it('exige pasto ou categoria', async () => {
      await expect(service.listarGrupo('f1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ordena pelo numero do brinco', async () => {
      const resultado = await service.listarGrupo('f1', { pastoId: 'p1' });
      expect(resultado.map((animal) => animal.brinco)).toEqual([
        '2',
        '3',
        '10',
      ]);
    });
  });

  describe('tratamentoEmLote', () => {
    it('avisa os ganchos uma vez por animal tratado (spec 004, R1)', async () => {
      const gancho = jest.fn();
      ganchosRebanho.registrar('tratamentoGravado', gancho);
      await service.tratamentoEmLote('f1', 'u1', tratamentoDto);
      expect(gancho).toHaveBeenCalledTimes(2);
      expect(gancho.mock.calls[0][1]).toMatchObject({
        fazendaId: 'f1',
        animalId: 'a10',
        tratamentoId: 'id-0',
        produto: 'Vacina aftosa',
        novo: true,
      });
    });

    it('cria um tratamento por animal marcado, ligado a sessao, e guarda as excecoes', async () => {
      const resultado = await service.tratamentoEmLote(
        'f1',
        'u1',
        tratamentoDto,
      );

      expect(tratamentoService.validarAplicador).toHaveBeenCalledWith(
        'f1',
        'USUARIO',
        'u1',
        undefined,
      );
      expect(manager.insert).toHaveBeenCalledWith(SessaoManejoExcecao, [
        { sessaoId: 'sessao-1', animalId: 'a3', motivo: 'Prenhez avançada' },
      ]);
      const [entidade, tratamentos] = manager.insert.mock.calls.find(
        ([e]) => e === Tratamento,
      )!;
      expect(entidade).toBe(Tratamento);
      expect(tratamentos).toHaveLength(2);
      expect(tratamentos[0]).toMatchObject({
        animalId: 'a10',
        produto: 'Vacina aftosa',
        proximaDataPrevista: '2026-12-04',
        aplicadoPorUsuarioId: 'u1',
        aplicadoPorVeterinarioId: null,
        lancadoPorId: 'u1',
        sessaoManejoId: 'sessao-1',
      });
      expect(resultado).toEqual({
        sessaoId: 'sessao-1',
        aplicados: 2,
        excecoes: 1,
      });
    });

    it('recusa quando o grupo mudou depois de carregado', async () => {
      const dto = { ...tratamentoDto, excecoes: [] };
      await expect(service.tratamentoEmLote('f1', 'u1', dto)).rejects.toThrow(
        'O grupo mudou',
      );
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('recusa animal marcado e nas excecoes ao mesmo tempo', async () => {
      const dto = {
        ...tratamentoDto,
        animalIds: ['a10', 'a2', 'a3'],
        excecoes: [{ animalId: 'a3', motivo: 'x' }],
      };
      await expect(service.tratamentoEmLote('f1', 'u1', dto)).rejects.toThrow(
        'ao mesmo tempo',
      );
    });

    it('recusa sessao sem nenhum animal marcado', async () => {
      const dto = {
        ...tratamentoDto,
        animalIds: [],
        excecoes: grupo.map((animal) => ({ animalId: animal.id, motivo: 'x' })),
      };
      await expect(service.tratamentoEmLote('f1', 'u1', dto)).rejects.toThrow(
        'ao menos um',
      );
    });
  });

  describe('pastoEmLote', () => {
    const pastoDto = {
      categoria: undefined,
      pastoId: 'p1',
      animalIds: ['a10', 'a2', 'a3'],
      excecoes: [],
      pastoDestinoId: 'p2',
      data: '2026-11-04',
    };

    it('move so quem nao esta no destino e fecha a permanencia anterior', async () => {
      const resultado = await service.pastoEmLote('f1', 'u1', pastoDto);

      expect(manager.update).toHaveBeenCalledWith(
        MovimentacaoPasto,
        expect.objectContaining({ dataSaida: expect.anything() }),
        { dataSaida: '2026-11-04' },
      );
      const [, movimentacoes] = manager.insert.mock.calls.find(
        ([e]) => e === MovimentacaoPasto,
      )!;
      expect(
        movimentacoes.map((m: { animalId: string }) => m.animalId),
      ).toEqual(['a2', 'a10']);
      expect(manager.update).toHaveBeenCalledWith(Animal, expect.anything(), {
        pastoAtualId: 'p2',
        atualizadoPorId: 'u1',
      });
      expect(resultado).toEqual({
        sessaoId: 'sessao-1',
        movidos: 2,
        jaEstavamNoDestino: 1,
        excecoes: 0,
      });
    });

    it('recusa destino igual ao pasto de origem', async () => {
      await expect(
        service.pastoEmLote('f1', 'u1', { ...pastoDto, pastoDestinoId: 'p1' }),
      ).rejects.toThrow('mesmo de onde');
    });
  });
});
