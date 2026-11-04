import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ConsultaPublicaService } from './consulta-publica.service';
import { CodigoIdentificacao } from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Pesagem } from '../pesagem/entities/pesagem.entity';
import { Tratamento } from '../tratamento/entities/tratamento.entity';
import { ValorArrobaCategoria } from '../configuracao/entities/valor-arroba-categoria.entity';

describe('ConsultaPublicaService', () => {
  let service: ConsultaPublicaService;

  const codigoRepository = { findOne: jest.fn() };
  const animalRepository = { findOne: jest.fn() };
  const pesagemRepository = { find: jest.fn() };
  const tratamentoRepository = { find: jest.fn() };
  const valorArrobaRepository = { findOne: jest.fn() };

  const registroVinculado = {
    codigo: 'd9459e89',
    status: 'VINCULADO',
    animalId: 'a1',
    fazendaId: 'f1',
    fazenda: { nome: 'Fazenda Boa Vista', id: 'f1' },
  };

  const animalAtivo = {
    id: 'a1',
    fazendaId: 'f1',
    brinco: '240',
    status: 'ATIVO',
    sexo: 'F',
    categoria: 'NOVILHA',
    dataNascimento: '2025-01-10',
    origem: 'NASCIDO_FAZENDA',
    pastoAtualId: 'pasto-secreto',
    motivoStatus: null,
    criadoPorId: 'u1',
    raca: { nome: 'Nelore' },
    mae: { brinco: '12' },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultaPublicaService,
        { provide: getRepositoryToken(CodigoIdentificacao), useValue: codigoRepository },
        { provide: getRepositoryToken(Animal), useValue: animalRepository },
        { provide: getRepositoryToken(Pesagem), useValue: pesagemRepository },
        { provide: getRepositoryToken(Tratamento), useValue: tratamentoRepository },
        { provide: getRepositoryToken(ValorArrobaCategoria), useValue: valorArrobaRepository },
      ],
    }).compile();

    service = module.get(ConsultaPublicaService);
  });

  it('rejeita codigo fora do formato sem consultar o banco', async () => {
    await expect(service.consultar('../../etc')).rejects.toThrow(NotFoundException);
    expect(codigoRepository.findOne).not.toHaveBeenCalled();
  });

  it('nao revela etiqueta que ainda nao foi vinculada', async () => {
    codigoRepository.findOne.mockResolvedValue({ ...registroVinculado, status: 'DISPONIVEL', animalId: null });
    await expect(service.consultar('d9459e89')).rejects.toThrow(NotFoundException);
  });

  it('avisa quando a etiqueta foi substituida', async () => {
    codigoRepository.findOne.mockResolvedValue({ ...registroVinculado, status: 'DESATIVADO' });

    const resultado = await service.consultar('d9459e89');

    expect(resultado).toEqual({
      situacao: 'ETIQUETA_SUBSTITUIDA',
      fazenda: { nome: 'Fazenda Boa Vista' },
      animal: null,
    });
  });

  it('nao mostra dados de animal que saiu do rebanho', async () => {
    codigoRepository.findOne.mockResolvedValue(registroVinculado);
    animalRepository.findOne.mockResolvedValue({ ...animalAtivo, status: 'VENDIDO' });

    const resultado = await service.consultar('d9459e89');

    expect(resultado.situacao).toBe('FORA_DO_REBANHO');
    expect(resultado.animal).toBeNull();
    expect(pesagemRepository.find).not.toHaveBeenCalled();
  });

  it('monta o perfil publico com peso atual e sem campos internos', async () => {
    codigoRepository.findOne.mockResolvedValue(registroVinculado);
    animalRepository.findOne.mockResolvedValue(animalAtivo);
    pesagemRepository.find.mockResolvedValue([
      { data: '2026-01-01', pesoKg: '200.00', pesadoPorId: 'u1', observacao: 'interna' },
      { data: '2026-01-11', pesoKg: '210.00', pesadoPorId: 'u1', observacao: null },
    ]);
    tratamentoRepository.find.mockResolvedValue([
      { produto: 'Vacina aftosa', data: '2026-02-01', lancadoPorId: 'u1', aplicadoPorUsuarioId: 'u2' },
    ]);
    // Novilha nesta fazenda: 13 kg por arroba
    valorArrobaRepository.findOne.mockResolvedValue({ pesoReferenciaKg: '13.00' });

    const resultado = await service.consultar(' D9459E89 ');

    expect(codigoRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { codigo: 'd9459e89' } }),
    );
    expect(resultado.situacao).toBe('ATIVO');
    expect(resultado.animal).toEqual({
      brinco: '240',
      raca: 'Nelore',
      sexo: 'F',
      categoria: 'NOVILHA',
      dataNascimento: '2025-01-10',
      origem: 'NASCIDO_FAZENDA',
      maeBrinco: '12',
      pesoAtual: { data: '2026-01-11', pesoKg: 210, gmdDesdeAnterior: 1, arrobas: 16.2 },
      pesagens: [
        { data: '2026-01-11', pesoKg: 210, gmdDesdeAnterior: 1 },
        { data: '2026-01-01', pesoKg: 200, gmdDesdeAnterior: null },
      ],
      tratamentos: [{ produto: 'Vacina aftosa', data: '2026-02-01' }],
    });
    expect(valorArrobaRepository.findOne).toHaveBeenCalledWith({
      where: { configuracaoFazenda: { fazendaId: 'f1' }, categoria: 'NOVILHA' },
    });
    expect(JSON.stringify(resultado)).not.toMatch(/pasto|criadoPor|lancadoPor|observacao|fazendaId/);
  });

  it('peso atual fica vazio quando o animal nunca foi pesado', async () => {
    codigoRepository.findOne.mockResolvedValue(registroVinculado);
    animalRepository.findOne.mockResolvedValue({ ...animalAtivo, raca: null, mae: null });
    pesagemRepository.find.mockResolvedValue([]);
    tratamentoRepository.find.mockResolvedValue([]);

    const resultado = await service.consultar('d9459e89');

    expect(resultado.animal?.pesoAtual).toBeNull();
    expect(resultado.animal?.raca).toBeNull();
    expect(resultado.animal?.maeBrinco).toBeNull();
  });

  it('usa 15 kg por arroba quando a fazenda nao configurou a categoria', async () => {
    codigoRepository.findOne.mockResolvedValue(registroVinculado);
    animalRepository.findOne.mockResolvedValue(animalAtivo);
    pesagemRepository.find.mockResolvedValue([{ data: '2026-01-01', pesoKg: '450.00' }]);
    tratamentoRepository.find.mockResolvedValue([]);
    valorArrobaRepository.findOne.mockResolvedValue(null);

    const resultado = await service.consultar('d9459e89');

    expect(resultado.animal?.pesoAtual?.arrobas).toBe(30);
  });

  it('fazenda suspensa: só fazenda, brinco, raça, sexo e categoria (spec 002, FR-028)', async () => {
    codigoRepository.findOne.mockResolvedValue({
      ...registroVinculado,
      fazenda: { ...registroVinculado.fazenda, suspensa: true },
    });
    animalRepository.findOne.mockResolvedValue(animalAtivo);

    const resultado = await service.consultar('d9459e89');

    expect(resultado).toEqual({
      situacao: 'FAZENDA_SUSPENSA',
      fazenda: { nome: 'Fazenda Boa Vista' },
      animal: { brinco: '240', raca: 'Nelore', sexo: 'F', categoria: 'NOVILHA' },
    });
    expect(pesagemRepository.find).not.toHaveBeenCalled();
    expect(tratamentoRepository.find).not.toHaveBeenCalled();
  });
});
