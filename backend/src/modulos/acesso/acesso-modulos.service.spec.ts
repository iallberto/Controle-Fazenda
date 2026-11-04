import { AcessoModulosService } from './acesso-modulos.service';
import { ModuloPago } from './modulo-pago';

describe('AcessoModulosService (research R5)', () => {
  const repo = { find: jest.fn() };
  let service: AcessoModulosService;
  let agora: number;

  beforeEach(() => {
    jest.clearAllMocks();
    agora = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => agora);
    repo.find.mockResolvedValue([
      {
        modulo: ModuloPago.FINANCEIRO,
        dataInicio: '2026-01-01',
        dataTermino: '2026-11-11',
        desativadoEm: null,
      },
      {
        modulo: ModuloPago.NUTRICAO,
        dataInicio: '2026-01-01',
        dataTermino: null,
        desativadoEm: new Date('2026-06-01T12:00:00'),
      },
    ]);
    service = new AcessoModulosService(repo as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('devolve os três módulos, sempre na mesma ordem', async () => {
    expect(await service.listar('f1', '2026-11-04')).toEqual([
      {
        modulo: 'LEITE',
        situacao: 'NAO_CONTRATADO',
        dataTermino: null,
        diasParaVencer: null,
      },
      {
        modulo: 'FINANCEIRO',
        situacao: 'ATIVO',
        dataTermino: '2026-11-11',
        diasParaVencer: 7,
      },
      {
        modulo: 'NUTRICAO',
        situacao: 'SO_CONSULTA',
        dataTermino: null,
        diasParaVencer: null,
      },
    ]);
    expect(repo.find).toHaveBeenCalledWith({ where: { fazendaId: 'f1' } });
  });

  it('usa o cache por 60 s e consulta de novo depois', async () => {
    await service.situacao('f1', ModuloPago.LEITE);
    agora += 59_000;
    await service.situacao('f1', ModuloPago.FINANCEIRO);
    expect(repo.find).toHaveBeenCalledTimes(1);
    agora += 2_000;
    await service.situacao('f1', ModuloPago.LEITE);
    expect(repo.find).toHaveBeenCalledTimes(2);
  });

  it('limparCache força nova consulta só daquela fazenda', async () => {
    await service.situacao('f1', ModuloPago.LEITE);
    await service.situacao('f2', ModuloPago.LEITE);
    service.limparCache('f1');
    await service.situacao('f1', ModuloPago.LEITE);
    await service.situacao('f2', ModuloPago.LEITE);
    expect(repo.find).toHaveBeenCalledTimes(3);
  });
});
