"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const fazenda_module_1 = require("./fazenda/fazenda.module");
const usuario_module_1 = require("./usuario/usuario.module");
const pasto_module_1 = require("./pasto/pasto.module");
const raca_module_1 = require("./raca/raca.module");
const animal_module_1 = require("./animal/animal.module");
const parto_module_1 = require("./parto/parto.module");
const tratamento_module_1 = require("./tratamento/tratamento.module");
const codigo_identificacao_module_1 = require("./codigo-identificacao/codigo-identificacao.module");
const auth_module_1 = require("./auth/auth.module");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const core_1 = require("@nestjs/core");
const roles_guard_1 = require("./auth/guards/roles.guard");
const movimentacao_pasto_module_1 = require("./movimentacao-pasto/movimentacao-pasto.module");
const configuracao_module_1 = require("./configuracao/configuracao.module");
const relatorio_module_1 = require("./relatorio/relatorio.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DB_HOST'),
                    port: config.get('DB_PORT'),
                    username: config.get('DB_USERNAME'),
                    password: config.get('DB_PASSWORD'),
                    database: config.get('DB_DATABASE'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    synchronize: true,
                }),
            }),
            fazenda_module_1.FazendaModule,
            usuario_module_1.UsuarioModule,
            pasto_module_1.PastoModule,
            raca_module_1.RacaModule,
            animal_module_1.AnimalModule,
            parto_module_1.PartoModule,
            tratamento_module_1.TratamentoModule,
            codigo_identificacao_module_1.CodigoIdentificacaoModule,
            auth_module_1.AuthModule,
            movimentacao_pasto_module_1.MovimentacaoPastoModule,
            configuracao_module_1.ConfiguracaoModule,
            relatorio_module_1.RelatorioModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map