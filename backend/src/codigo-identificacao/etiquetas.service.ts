import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Between, In, Repository } from 'typeorm';
import { CodigoIdentificacao } from './entities/codigo-identificacao.entity';

// Medidas da etiqueta definidas em docs/pos-v1/Etiqueta-e-consulta-publica.md
// (spec 008, R6). Tudo em milímetros; o PDF usa pontos (1 mm = 72 / 25,4 pt).
export const MEDIDAS = {
  folhaLargura: 210,
  folhaAltura: 297,
  colunas: 3,
  linhas: 8,
  largura: 57,
  altura: 32,
  espaco: 3,
  qr: 28,
  // Altura máxima dos dígitos; números longos ficam menores para caber
  digitos: 16,
  raio: 2.5,
} as const;
export const ETIQUETAS_POR_FOLHA = MEDIDAS.colunas * MEDIDAS.linhas;
export const MAX_ETIQUETAS = 500;

const PT = 72 / 25.4;
const mm = (valor: number) => valor * PT;

// Só gera etiquetas com o domínio definitivo: o endereço fica gravado no QR
// para sempre. Recusa vazio, http, localhost e endereço IP (FR-008).
export function urlPublicaValida(valor: string | undefined): string | null {
  if (!valor) return null;
  let url: URL;
  try {
    url = new URL(valor.trim());
  } catch {
    return null;
  }
  const host = url.hostname;
  if (url.protocol !== 'https:') return null;
  if (host === 'localhost' || host.endsWith('.localhost') || /^[\d.]+$/.test(host) || host.includes(':')) {
    return null;
  }
  if (!host.includes('.')) return null;
  return `https://${host}${url.port ? `:${url.port}` : ''}`;
}

// Posição (canto superior esquerdo, em mm) da etiqueta n dentro da folha
export function posicaoNaFolha(indice: number) {
  const larguraGrade = MEDIDAS.colunas * MEDIDAS.largura + (MEDIDAS.colunas - 1) * MEDIDAS.espaco;
  const alturaGrade = MEDIDAS.linhas * MEDIDAS.altura + (MEDIDAS.linhas - 1) * MEDIDAS.espaco;
  const margemX = (MEDIDAS.folhaLargura - larguraGrade) / 2;
  const margemY = (MEDIDAS.folhaAltura - alturaGrade) / 2;
  const naFolha = indice % ETIQUETAS_POR_FOLHA;
  const coluna = naFolha % MEDIDAS.colunas;
  const linha = Math.floor(naFolha / MEDIDAS.colunas);
  return {
    folha: Math.floor(indice / ETIQUETAS_POR_FOLHA),
    x: margemX + coluna * (MEDIDAS.largura + MEDIDAS.espaco),
    y: margemY + linha * (MEDIDAS.altura + MEDIDAS.espaco),
    margemX,
    margemY,
  };
}

// PDF das etiquetas com QR para a gráfica (spec 008, US2): folha A4, 3 × 8
// etiquetas de 57 × 32 mm com marcas de corte; número sem zeros à esquerda do
// lado esquerdo e QR de 28 mm do lado direito, com o link público do código
// (pedido do dono do produto, 2026-11-06).
@Injectable()
export class EtiquetasService {
  constructor(
    @InjectRepository(CodigoIdentificacao)
    private readonly codigoRepository: Repository<CodigoIdentificacao>,
    private readonly config: ConfigService,
  ) {}

  async gerarPdf(
    fazendaId: string,
    filtro: { ids?: string[]; numeroDe?: number; numeroAte?: number },
  ): Promise<{ arquivo: Buffer; quantidade: number }> {
    const base = urlPublicaValida(this.config.get<string>('URL_PUBLICA'));
    if (!base) {
      throw new ConflictException({
        statusCode: 409,
        codigo: 'DOMINIO_NAO_DEFINIDO',
        message: 'O endereço definitivo do sistema ainda não foi configurado: as etiquetas não podem ser geradas',
      });
    }

    let codigos: CodigoIdentificacao[];
    if (filtro.ids?.length) {
      codigos = await this.codigoRepository.find({
        where: { fazendaId, id: In(filtro.ids) },
        order: { numero: 'ASC' },
      });
    } else if (filtro.numeroDe !== undefined && filtro.numeroAte !== undefined) {
      if (filtro.numeroAte < filtro.numeroDe) {
        throw new BadRequestException('O número final precisa ser maior ou igual ao inicial');
      }
      codigos = await this.codigoRepository.find({
        where: { fazendaId, numero: Between(filtro.numeroDe, filtro.numeroAte) },
        order: { numero: 'ASC' },
      });
    } else {
      throw new BadRequestException('Escolha os códigos ou a faixa de números');
    }
    if (codigos.length === 0) throw new NotFoundException('Nenhum código encontrado');
    if (codigos.length > MAX_ETIQUETAS) {
      throw new BadRequestException(`No máximo ${MAX_ETIQUETAS} etiquetas por arquivo`);
    }

    const arquivo = await this.desenhar(
      codigos.map((c) => ({ numero: c.numero, link: `${base}/a/${c.codigo}` })),
    );
    return { arquivo, quantidade: codigos.length };
  }

  private desenhar(etiquetas: { numero: number; link: string }[]): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: 'Etiquetas Controle Fazenda' } });
    const partes: Buffer[] = [];
    doc.on('data', (parte: Buffer) => partes.push(parte));
    const pronto = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(partes))));

    etiquetas.forEach((etiqueta, indice) => {
      const pos = posicaoNaFolha(indice);
      if (indice > 0 && indice % ETIQUETAS_POR_FOLHA === 0) doc.addPage({ size: 'A4', margin: 0 });
      if (indice % ETIQUETAS_POR_FOLHA === 0) this.marcasDeCorte(doc, pos.margemX, pos.margemY);
      this.etiqueta(doc, pos.x, pos.y, etiqueta);
    });
    doc.end();
    return pronto;
  }

  private etiqueta(doc: PDFKit.PDFDocument, x: number, y: number, etiqueta: { numero: number; link: string }) {
    // Contorno bem claro, só como guia; o corte segue as marcas da margem
    doc
      .lineWidth(0.25)
      .strokeColor('#c8c8c8')
      .roundedRect(mm(x), mm(y), mm(MEDIDAS.largura), mm(MEDIDAS.altura), mm(MEDIDAS.raio))
      .stroke();

    // QR de 28 mm do lado direito, centrado na altura, com 2 módulos de margem branca
    const qr = QRCode.create(etiqueta.link, { errorCorrectionLevel: 'M' });
    const tamanho = qr.modules.size;
    const margemModulos = 2;
    const modulo = MEDIDAS.qr / (tamanho + 2 * margemModulos);
    const borda = (MEDIDAS.altura - MEDIDAS.qr) / 2;
    const qx = x + MEDIDAS.largura - borda - MEDIDAS.qr;
    const qy = y + (MEDIDAS.altura - MEDIDAS.qr) / 2;
    doc.fillColor('#000000');
    for (let linha = 0; linha < tamanho; linha++) {
      let inicio = -1;
      for (let coluna = 0; coluna <= tamanho; coluna++) {
        const preto = coluna < tamanho && qr.modules.get(linha, coluna) === 1;
        if (preto && inicio < 0) inicio = coluna;
        if (!preto && inicio >= 0) {
          doc
            .rect(
              mm(qx + (margemModulos + inicio) * modulo),
              mm(qy + (margemModulos + linha) * modulo),
              mm((coluna - inicio) * modulo) + 0.01,
              mm(modulo) + 0.01,
            )
            .fill();
          inicio = -1;
        }
      }
    }

    // Número sem zeros à esquerda, o maior que couber do lado esquerdo do QR
    const texto = String(etiqueta.numero);
    const areaX = x + 1.5;
    const areaLargura = qx - 2.5 - areaX;
    doc.font('Helvetica-Bold').fontSize(100);
    const larguraPorPt = doc.widthOfString(texto) / 100;
    // Altura dos dígitos ≈ 0,72 do tamanho da fonte na Helvetica
    const tamanhoPorAltura = mm(MEDIDAS.digitos) / 0.72;
    const tamanhoPorLargura = mm(areaLargura) / larguraPorPt;
    const fonte = Math.min(tamanhoPorAltura, tamanhoPorLargura);
    doc.fontSize(fonte);
    const alturaDigitos = fonte * 0.72;
    const larguraTexto = doc.widthOfString(texto);
    doc.text(
      texto,
      mm(areaX) + (mm(areaLargura) - larguraTexto) / 2,
      mm(y + MEDIDAS.altura / 2) - alturaDigitos / 2 - fonte * 0.18,
      { lineBreak: false },
    );
  }

  // Marcas de corte nas margens, alinhadas com as bordas de cada etiqueta
  private marcasDeCorte(doc: PDFKit.PDFDocument, margemX: number, margemY: number) {
    const comprimento = 4;
    const folga = 1.5;
    const xs: number[] = [];
    for (let c = 0; c < MEDIDAS.colunas; c++) {
      const esquerda = margemX + c * (MEDIDAS.largura + MEDIDAS.espaco);
      xs.push(esquerda, esquerda + MEDIDAS.largura);
    }
    const ys: number[] = [];
    for (let l = 0; l < MEDIDAS.linhas; l++) {
      const topo = margemY + l * (MEDIDAS.altura + MEDIDAS.espaco);
      ys.push(topo, topo + MEDIDAS.altura);
    }
    const fimY = margemY + MEDIDAS.linhas * MEDIDAS.altura + (MEDIDAS.linhas - 1) * MEDIDAS.espaco;
    const fimX = margemX + MEDIDAS.colunas * MEDIDAS.largura + (MEDIDAS.colunas - 1) * MEDIDAS.espaco;
    doc.lineWidth(0.3).strokeColor('#000000');
    for (const x of xs) {
      doc.moveTo(mm(x), mm(margemY - folga - comprimento)).lineTo(mm(x), mm(margemY - folga)).stroke();
      doc.moveTo(mm(x), mm(fimY + folga)).lineTo(mm(x), mm(fimY + folga + comprimento)).stroke();
    }
    for (const y of ys) {
      doc.moveTo(mm(margemX - folga - comprimento), mm(y)).lineTo(mm(margemX - folga), mm(y)).stroke();
      doc.moveTo(mm(fimX + folga), mm(y)).lineTo(mm(fimX + folga + comprimento), mm(y)).stroke();
    }
  }
}
