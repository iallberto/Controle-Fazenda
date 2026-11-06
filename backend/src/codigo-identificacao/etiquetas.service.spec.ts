import { BadRequestException, ConflictException } from '@nestjs/common';
import * as QRCode from 'qrcode';

// Mesmo QR de verdade, mas observável: confere o link gravado em cada etiqueta
jest.mock('qrcode', () => {
  const real = jest.requireActual<typeof import('qrcode')>('qrcode');
  return { ...real, create: jest.fn(real.create) };
});

import { EtiquetasService, MEDIDAS, posicaoNaFolha, urlPublicaValida } from './etiquetas.service';

describe('Etiquetas com QR (spec 008, US2)', () => {
  describe('urlPublicaValida (FR-008)', () => {
    it('aceita só https com domínio de verdade', () => {
      expect(urlPublicaValida('https://app.controlefazenda.com.br')).toBe('https://app.controlefazenda.com.br');
      expect(urlPublicaValida('https://app.controlefazenda.com.br/')).toBe('https://app.controlefazenda.com.br');
      for (const ruim of [undefined, '', 'http://app.com.br', 'https://localhost', 'https://192.168.0.10', 'https://intranet', 'lixo']) {
        expect(urlPublicaValida(ruim)).toBeNull();
      }
    });
  });

  describe('posicaoNaFolha', () => {
    it('3 × 8 por folha, grade centrada, 3 mm entre etiquetas', () => {
      const primeira = posicaoNaFolha(0);
      expect(primeira).toMatchObject({ folha: 0, x: 16.5, y: 10 });
      expect(posicaoNaFolha(1).x).toBeCloseTo(16.5 + MEDIDAS.largura + MEDIDAS.espaco);
      expect(posicaoNaFolha(3).y).toBeCloseTo(10 + MEDIDAS.altura + MEDIDAS.espaco);
      expect(posicaoNaFolha(24)).toMatchObject({ folha: 1, x: 16.5, y: 10 });
      // A última etiqueta da folha ainda cabe no A4
      const ultima = posicaoNaFolha(23);
      expect(ultima.x + MEDIDAS.largura).toBeLessThanOrEqual(210);
      expect(ultima.y + MEDIDAS.altura).toBeLessThanOrEqual(297);
    });
  });

  describe('gerarPdf', () => {
    const repo = { find: jest.fn() };
    const config = { get: jest.fn() };
    const service = new EtiquetasService(repo as never, config as never);
    const codigos = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `c${i}`, numero: i + 1, codigo: `cod${String(i).padStart(5, '0')}` }));

    beforeEach(() => jest.clearAllMocks());

    it('sem domínio definitivo: 409 DOMINIO_NAO_DEFINIDO', async () => {
      config.get.mockReturnValue(undefined);
      const erro = await service.gerarPdf('f1', { ids: ['c1'] }).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(ConflictException);
      expect((erro as ConflictException).getResponse()).toMatchObject({ codigo: 'DOMINIO_NAO_DEFINIDO' });
    });

    it('30 códigos: PDF de 2 folhas A4', async () => {
      config.get.mockReturnValue('https://app.controlefazenda.com.br');
      repo.find.mockResolvedValue(codigos(30));
      const { arquivo, quantidade } = await service.gerarPdf('f1', { numeroDe: 1, numeroAte: 30 });
      expect(quantidade).toBe(30);
      const texto = arquivo.toString('latin1');
      expect(texto.startsWith('%PDF')).toBe(true);
      expect(texto.match(/\/Type \/Page\b/g)).toHaveLength(2);
    });

    it('cada QR leva ao link público do código no domínio definitivo', async () => {
      config.get.mockReturnValue('https://app.controlefazenda.com.br/');
      repo.find.mockResolvedValue(codigos(2));
      const espiao = QRCode.create as jest.Mock;
      espiao.mockClear();
      await service.gerarPdf('f1', { ids: ['c0', 'c1'] });
      expect(espiao.mock.calls.map((c) => c[0])).toEqual([
        'https://app.controlefazenda.com.br/a/cod00000',
        'https://app.controlefazenda.com.br/a/cod00001',
      ]);
    });

    it('sem filtro ou faixa invertida: 400', async () => {
      config.get.mockReturnValue('https://app.controlefazenda.com.br');
      await expect(service.gerarPdf('f1', {})).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.gerarPdf('f1', { numeroDe: 10, numeroAte: 1 })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
