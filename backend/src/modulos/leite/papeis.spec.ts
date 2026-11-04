import { METHOD_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { LeiteModule } from './leite.module';

// No Leite, dono e funcionário lançam e consultam quase tudo; só o dono mexe
// em dinheiro (preço do leite), na configuração e em "vaca de leite"
// (spec 004, FR-002; research R9).
const SO_DO_DONO = new Set([
  'ConfiguracaoLeiteController.editar',
  'VacasController.vacaDeLeite',
  'EntregasController.preco',
  'EntregasController.precoDoMes',
]);

describe('Papéis nas rotas do Leite (FR-002)', () => {
  const controllers: (new (...args: never[]) => object)[] =
    Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, LeiteModule) ?? [];

  const rotas = controllers.flatMap((controller) =>
    Object.getOwnPropertyNames(controller.prototype)
      .filter((metodo) => metodo !== 'constructor')
      .map((metodo) => {
        const handler = (controller.prototype as Record<string, unknown>)[metodo] as object;
        return {
          nome: `${controller.name}.${metodo}`,
          ehRota: Reflect.getMetadata(METHOD_METADATA, handler) !== undefined,
          papeis:
            (Reflect.getMetadata(ROLES_KEY, handler) as PapelUsuario[] | undefined) ??
            (Reflect.getMetadata(ROLES_KEY, controller) as PapelUsuario[] | undefined),
        };
      })
      .filter((rota) => rota.ehRota),
  );

  it('encontra as rotas (para o teste não passar vazio)', () => {
    expect(rotas.length).toBeGreaterThan(20);
  });

  it('as rotas do dono exigem DONO', () => {
    for (const nome of SO_DO_DONO) {
      const rota = rotas.find((r) => r.nome === nome);
      expect(rota).toBeDefined();
      expect(rota?.papeis).toEqual([PapelUsuario.DONO]);
    }
  });

  it('as demais rotas aceitam os dois papéis', () => {
    const restritas = rotas
      .filter((r) => !SO_DO_DONO.has(r.nome) && r.papeis !== undefined)
      .map((r) => r.nome);
    expect(restritas).toEqual([]);
  });
});
