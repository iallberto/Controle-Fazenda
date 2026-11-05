import { METHOD_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';
import { NutricaoModule } from './nutricao.module';

// Na Nutrição, dono e funcionário lançam entradas, baixas e tratos, abrem silo e
// mexem nos animais dos lotes; só o dono cadastra insumos, dietas, lotes e
// silos, e vê dinheiro (spec 005, FR-002; research R7)
const SO_DO_DONO = new Set([
  'InsumosController.criar',
  'InsumosController.editar',
  'InsumosController.criarUnidade',
  'InsumosController.editarUnidade',
  'DietasController.criar',
  'DietasController.substituir',
  'DietasController.ativar',
  'LotesController.criar',
  'LotesController.editar',
  'SilosController.criar',
  'SilosController.editar',
  'SilosController.encerrar',
  'CustoController.aguardandoPreco',
  'CustoController.preco',
  'CustoController.pendencias',
  'CustoController.custo',
]);

describe('Papéis nas rotas da Nutrição (FR-002)', () => {
  const controllers: (new (...args: never[]) => object)[] =
    Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, NutricaoModule) ?? [];

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
    expect(rotas.length).toBeGreaterThan(25);
  });

  it('as rotas do dono exigem DONO', () => {
    for (const nome of SO_DO_DONO) {
      const rota = rotas.find((r) => r.nome === nome);
      expect(rota).toBeDefined();
      expect(rota?.papeis).toEqual([PapelUsuario.DONO]);
    }
  });

  it('as demais aceitam os dois papéis', () => {
    expect(rotas.filter((r) => !SO_DO_DONO.has(r.nome) && r.papeis !== undefined).map((r) => r.nome)).toEqual([]);
  });
});
