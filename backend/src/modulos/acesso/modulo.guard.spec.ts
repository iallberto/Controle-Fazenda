import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuloGuard } from './modulo.guard';
import { Modulo } from './modulo.decorator';
import { ModuloPago, type SituacaoModulo } from './modulo-pago';
import type { AcessoModulosService } from './acesso-modulos.service';

@Modulo(ModuloPago.FINANCEIRO)
class ControllerFinanceiro {
  listar() {}
  lancar() {}
  @Modulo(ModuloPago.FINANCEIRO, 'CONSULTA')
  simular() {}
}

class ControllerDoPacoteInicial {
  listar() {}
}

describe('ModuloGuard (research R4)', () => {
  let situacao: SituacaoModulo;
  const situacaoMock = jest.fn(async () => situacao);
  const acesso = {
    situacao: situacaoMock,
  } as unknown as AcessoModulosService;
  const guard = new ModuloGuard(new Reflector(), acesso);

  const contexto = (
    classe: new () => object,
    metodo: string,
    http: string,
  ): ExecutionContext =>
    ({
      getClass: () => classe,
      getHandler: () => (classe.prototype as Record<string, unknown>)[metodo],
      switchToHttp: () => ({
        getRequest: () => ({ method: http, user: { fazendaId: 'f1' } }),
      }),
    }) as unknown as ExecutionContext;

  const codigoDoErro = async (promessa: Promise<unknown>) => {
    try {
      await promessa;
      return null;
    } catch (erro) {
      expect(erro).toBeInstanceOf(ForbiddenException);
      return ((erro as ForbiddenException).getResponse() as { codigo: string })
        .codigo;
    }
  };

  beforeEach(() => jest.clearAllMocks());

  it('rota sem @Modulo passa sem consultar nada', async () => {
    await expect(
      guard.canActivate(contexto(ControllerDoPacoteInicial, 'listar', 'GET')),
    ).resolves.toBe(true);
    expect(situacaoMock).not.toHaveBeenCalled();
  });

  it('módulo ativo: consulta e lançamento passam', async () => {
    situacao = 'ATIVO';
    await expect(
      guard.canActivate(contexto(ControllerFinanceiro, 'listar', 'GET')),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contexto(ControllerFinanceiro, 'lancar', 'POST')),
    ).resolves.toBe(true);
    expect(situacaoMock).toHaveBeenCalledWith('f1', ModuloPago.FINANCEIRO);
  });

  it('só consulta: GET passa, POST recusado com MODULO_SO_CONSULTA (FR-011a)', async () => {
    situacao = 'SO_CONSULTA';
    await expect(
      guard.canActivate(contexto(ControllerFinanceiro, 'listar', 'GET')),
    ).resolves.toBe(true);
    expect(
      await codigoDoErro(
        guard.canActivate(contexto(ControllerFinanceiro, 'lancar', 'POST')),
      ),
    ).toBe('MODULO_SO_CONSULTA');
  });

  it('não contratado: até a consulta é recusada com MODULO_NAO_CONTRATADO (FR-010)', async () => {
    situacao = 'NAO_CONTRATADO';
    expect(
      await codigoDoErro(
        guard.canActivate(contexto(ControllerFinanceiro, 'listar', 'GET')),
      ),
    ).toBe('MODULO_NAO_CONTRATADO');
  });

  it('a forma explícita no método vale mais que o método HTTP', async () => {
    situacao = 'SO_CONSULTA';
    await expect(
      guard.canActivate(contexto(ControllerFinanceiro, 'simular', 'POST')),
    ).resolves.toBe(true);
  });
});
