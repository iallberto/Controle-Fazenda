import {
  METHOD_METADATA,
  MODULE_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { FinanceiroModule } from './financeiro.module';
import { UsosController } from './usos.controller';

// Só o dono vê valores (spec 003, FR-002, SC-006; research R7). As únicas rotas
// abertas ao funcionário são as de registro de uso, que nunca devolvem valor.
const ABERTAS_AO_FUNCIONARIO = new Set([
  `${UsosController.name}.listar`,
  `${UsosController.name}.categorias`,
  `${UsosController.name}.registrar`,
]);

describe('Papéis nas rotas do Financeiro (FR-002)', () => {
  const controllers: (new (...args: never[]) => object)[] =
    Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, FinanceiroModule) ?? [];

  const rotas = controllers.flatMap((controller) =>
    Object.getOwnPropertyNames(controller.prototype)
      .filter((metodo) => metodo !== 'constructor')
      .map((metodo) => {
        const handler = (controller.prototype as Record<string, unknown>)[
          metodo
        ] as object;
        return {
          nome: `${controller.name}.${metodo}`,
          ehRota: Reflect.getMetadata(METHOD_METADATA, handler) !== undefined,
          caminho: Reflect.getMetadata(PATH_METADATA, handler) as
            string | undefined,
          papeis:
            (Reflect.getMetadata(ROLES_KEY, handler) as
              PapelUsuario[] | undefined) ??
            (Reflect.getMetadata(ROLES_KEY, controller) as
              PapelUsuario[] | undefined),
        };
      })
      .filter((rota) => rota.ehRota),
  );

  it('encontra as rotas (para o teste não passar vazio)', () => {
    expect(rotas.length).toBeGreaterThan(20);
  });

  it('toda rota com valores exige o dono', () => {
    const semDono = rotas
      .filter((r) => !ABERTAS_AO_FUNCIONARIO.has(r.nome))
      .filter((r) => !r.papeis || r.papeis.join() !== PapelUsuario.DONO)
      .map((r) => r.nome);
    expect(semDono).toEqual([]);
  });

  it('as rotas de uso abertas não exigem papel', () => {
    for (const nome of ABERTAS_AO_FUNCIONARIO) {
      const rota = rotas.find((r) => r.nome === nome);
      expect(rota).toBeDefined();
      expect(rota?.papeis).toBeUndefined();
    }
  });
});
