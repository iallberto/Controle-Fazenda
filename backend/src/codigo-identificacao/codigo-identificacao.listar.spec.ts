import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { CodigoIdentificacao, StatusCodigo } from './entities/codigo-identificacao.entity';
import { HistoricoNumero } from './entities/historico-numero.entity';
import { Animal } from '../animal/entities/animal.entity';

describe('CodigoIdentificacaoService - listagem com filtros (M17)', () => {
  let service: CodigoIdentificacaoService;

  const codigoRepository = { find: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    codigoRepository.find.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        CodigoIdentificacaoService,
        { provide: getRepositoryToken(CodigoIdentificacao), useValue: codigoRepository },
        { provide: getRepositoryToken(Animal), useValue: {} },
        { provide: getRepositoryToken(HistoricoNumero), useValue: {} },
      ],
    }).compile();

    service = module.get(CodigoIdentificacaoService);
  });

  it('sem filtros, lista todos os códigos apenas da fazenda do usuário, em ordem', async () => {
    await service.listar('f1', {});

    expect(codigoRepository.find).toHaveBeenCalledWith({
      where: { fazendaId: 'f1' },
      relations: { animal: true },
      order: { numero: 'ASC' },
    });
  });

  it('filtra por status', async () => {
    await service.listar('f1', { status: StatusCodigo.VINCULADO });

    expect(codigoRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fazendaId: 'f1', status: StatusCodigo.VINCULADO },
      }),
    );
  });

  it('filtra por faixa completa (de e até)', async () => {
    await service.listar('f1', { de: 10, ate: 20 });

    expect(codigoRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fazendaId: 'f1', numero: Between(10, 20) },
      }),
    );
  });

  it('filtra só pelo início da faixa', async () => {
    await service.listar('f1', { de: 50 });

    expect(codigoRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fazendaId: 'f1', numero: MoreThanOrEqual(50) },
      }),
    );
  });

  it('filtra só pelo fim da faixa', async () => {
    await service.listar('f1', { ate: 30 });

    expect(codigoRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fazendaId: 'f1', numero: LessThanOrEqual(30) },
      }),
    );
  });

  it('combina status e faixa', async () => {
    await service.listar('f1', { status: StatusCodigo.DISPONIVEL, de: 1, ate: 100 });

    expect(codigoRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fazendaId: 'f1',
          status: StatusCodigo.DISPONIVEL,
          numero: Between(1, 100),
        },
      }),
    );
  });

  it('rejeita faixa invertida sem consultar o banco', async () => {
    await expect(service.listar('f1', { de: 20, ate: 10 })).rejects.toThrow(
      BadRequestException,
    );
    expect(codigoRepository.find).not.toHaveBeenCalled();
  });

  it('aceita faixa de um único número (de igual a até)', async () => {
    await service.listar('f1', { de: 7, ate: 7 });

    expect(codigoRepository.find).toHaveBeenCalled();
  });

  it('converte números que chegam como texto da query string', async () => {
    await service.listar('f1', {
      de: '5' as unknown as number,
      ate: '9' as unknown as number,
    });

    expect(codigoRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fazendaId: 'f1', numero: Between(5, 9) },
      }),
    );
  });
});