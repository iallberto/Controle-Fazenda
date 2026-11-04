import { situacaoDoModulo } from './situacao-modulo';

const HOJE = '2026-11-04';
const periodo = (
  dataInicio: string,
  dataTermino: string | null = null,
  desativadoEm: Date | null = null,
) => ({ dataInicio, dataTermino, desativadoEm });

describe('situacaoDoModulo (research R3)', () => {
  it('sem período, não contratado', () => {
    expect(situacaoDoModulo([], HOJE)).toEqual({
      situacao: 'NAO_CONTRATADO',
      dataTermino: null,
      diasParaVencer: null,
    });
  });

  it('início futuro ainda não contratado', () => {
    expect(situacaoDoModulo([periodo('2026-11-05')], HOJE).situacao).toBe(
      'NAO_CONTRATADO',
    );
  });

  it('ativo a partir do dia de início, sem término', () => {
    expect(situacaoDoModulo([periodo(HOJE)], HOJE)).toEqual({
      situacao: 'ATIVO',
      dataTermino: null,
      diasParaVencer: null,
    });
  });

  it('ativo no próprio dia do término, com 0 dia para vencer', () => {
    expect(situacaoDoModulo([periodo('2026-01-01', HOJE)], HOJE)).toEqual({
      situacao: 'ATIVO',
      dataTermino: HOJE,
      diasParaVencer: 0,
    });
  });

  it('dias para vencer contados até o término', () => {
    expect(
      situacaoDoModulo([periodo('2026-01-01', '2026-11-11')], HOJE)
        .diasParaVencer,
    ).toBe(7);
  });

  it('término passado: só consulta', () => {
    expect(
      situacaoDoModulo([periodo('2026-01-01', '2026-11-03')], HOJE).situacao,
    ).toBe('SO_CONSULTA');
  });

  it('desativado: só consulta, mesmo sem término', () => {
    expect(
      situacaoDoModulo([periodo('2026-01-01', null, new Date())], HOJE)
        .situacao,
    ).toBe('SO_CONSULTA');
  });

  it('período novo vigente vence o antigo desativado', () => {
    expect(
      situacaoDoModulo(
        [periodo('2025-01-01', null, new Date()), periodo('2026-10-01')],
        HOJE,
      ).situacao,
    ).toBe('ATIVO');
  });

  it('desativado antes de começar não conta como "já teve"', () => {
    expect(
      situacaoDoModulo([periodo('2026-12-01', null, new Date())], HOJE)
        .situacao,
    ).toBe('NAO_CONTRATADO');
  });
});
