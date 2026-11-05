import { ServiceUnavailableException } from '@nestjs/common';
import { SaudeController } from './saude.controller';

describe('SaudeController (spec 007, FR-014)', () => {
  it('banco respondendo: { status: ok }', async () => {
    const controller = new SaudeController({ query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as never);
    await expect(controller.verificar()).resolves.toEqual({ status: 'ok' });
  });

  it('banco fora: 503 { status: erro }', async () => {
    const controller = new SaudeController({ query: jest.fn().mockRejectedValue(new Error('sem conexão')) } as never);
    const erro = await controller.verificar().catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ServiceUnavailableException);
    expect((erro as ServiceUnavailableException).getResponse()).toEqual({ status: 'erro' });
  });
});
