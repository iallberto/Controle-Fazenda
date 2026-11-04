import { readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { MODULO_KEY, type MarcaModulo } from './modulo.decorator';
import { ModuloPago } from './modulo-pago';
import { LeiteModule } from '../leite/leite.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { NutricaoModule } from '../nutricao/nutricao.module';

// Todo controller de um módulo pago precisa da marca @Modulo do próprio módulo;
// sem ela, a rota ficaria aberta para qualquer fazenda (FR-009).
const MODULOS: [string, ModuloPago, object][] = [
  ['leite', ModuloPago.LEITE, LeiteModule],
  ['financeiro', ModuloPago.FINANCEIRO, FinanceiroModule],
  ['nutricao', ModuloPago.NUTRICAO, NutricaoModule],
];

describe('Marcação dos controllers dos módulos pagos (FR-009)', () => {
  it.each(MODULOS)(
    'controllers de %s têm @Modulo do próprio módulo',
    (pasta, modulo, moduloNest) => {
      const controllers: object[] =
        Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, moduloNest) ?? [];
      const arquivos = readdirSync(join(__dirname, '..', pasta), {
        recursive: true,
      })
        .map(String)
        .filter((nome) => nome.endsWith('.controller.ts'));

      // Nenhum controller fora do módulo Nest (e portanto sem checagem aqui)
      expect(controllers).toHaveLength(arquivos.length);
      for (const controller of controllers) {
        const marca = Reflect.getMetadata(MODULO_KEY, controller) as
          MarcaModulo | undefined;
        expect(marca?.modulo).toBe(modulo);
      }
    },
  );
});

// Cada módulo funciona sozinho (FR-024, decisões D5 e D6): o pacote inicial
// não depende de módulo pago, e um módulo pago não depende de outro. Só o
// app.module.ts registra os módulos.
describe('Fronteira entre o pacote inicial e os módulos pagos (FR-024)', () => {
  const RAIZ = join(__dirname, '..', '..');
  const PAGOS = MODULOS.map(([pasta]) => pasta);
  const IMPORT = /from\s+['"]([^'"]+)['"]/g;

  const arquivosTs = readdirSync(RAIZ, { recursive: true })
    .map(String)
    .filter((nome) => nome.endsWith('.ts'))
    .map((nome) => nome.split('\\').join('/'));

  // A qual módulo pago um caminho (relativo a src/) pertence, se a algum
  const moduloDoCaminho = (caminho: string) =>
    PAGOS.find((pasta) => caminho.startsWith(`modulos/${pasta}/`));

  const importacoes = arquivosTs.flatMap((arquivo) => {
    const texto = readFileSync(join(RAIZ, arquivo), 'utf8');
    return [...texto.matchAll(IMPORT)]
      .map((m) => m[1])
      .filter((alvo) => alvo.startsWith('.'))
      .map((alvo) => ({
        arquivo,
        alvo: posix.normalize(posix.join(posix.dirname(arquivo), alvo)),
      }));
  });

  it('o pacote inicial não importa nada dos módulos pagos', () => {
    const violacoes = importacoes.filter(
      ({ arquivo, alvo }) =>
        !arquivo.startsWith('modulos/') &&
        arquivo !== 'app.module.ts' &&
        moduloDoCaminho(alvo),
    );
    expect(violacoes).toEqual([]);
  });

  it('um módulo pago não importa outro', () => {
    const violacoes = importacoes.filter(({ arquivo, alvo }) => {
      const origem = moduloDoCaminho(arquivo);
      const destino = moduloDoCaminho(alvo);
      return origem && destino && origem !== destino;
    });
    expect(violacoes).toEqual([]);
  });

  it('a checagem enxerga as importações (para não passar vazia)', () => {
    expect(
      importacoes.some(
        ({ arquivo, alvo }) =>
          arquivo === 'app.module.ts' && alvo === 'modulos/leite/leite.module',
      ),
    ).toBe(true);
  });
});
