import { readdirSync } from 'node:fs';
import { join } from 'node:path';
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
