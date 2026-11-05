import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { opcoesBanco } from './database/data-source';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FazendaModule } from './fazenda/fazenda.module';
import { UsuarioModule } from './usuario/usuario.module';
import { PastoModule } from './pasto/pasto.module';
import { RacaModule } from './raca/raca.module';
import { AnimalModule } from './animal/animal.module';
import { PartoModule } from './parto/parto.module';
import { TratamentoModule } from './tratamento/tratamento.module';
import { CodigoIdentificacaoModule } from './codigo-identificacao/codigo-identificacao.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/guards/roles.guard';
import { SenhaProvisoriaGuard } from './auth/guards/senha-provisoria.guard';
import { MovimentacaoPastoModule } from './movimentacao-pasto/movimentacao-pasto.module';
import { ConfiguracaoModule } from './configuracao/configuracao.module';
import { RelatorioModule } from './relatorio/relatorio.module';
import { VeterinarioModule } from './veterinario/veterinario.module';
import { PesagemModule } from './pesagem/pesagem.module';
import { ConsultaPublicaModule } from './consulta-publica/consulta-publica.module';
import { ManejoLoteModule } from './manejo-lote/manejo-lote.module';
import { ReproducaoModule } from './reproducao/reproducao.module';
import { AcessoModule } from './modulos/acesso/acesso.module';
import { ModuloGuard } from './modulos/acesso/modulo.guard';
import { LeiteModule } from './modulos/leite/leite.module';
import { FinanceiroModule } from './modulos/financeiro/financeiro.module';
import { NutricaoModule } from './modulos/nutricao/nutricao.module';
import { AdminModule } from './modulos/admin/admin.module';
import { SaudeModule } from './saude/saude.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // O schema evolui só por migrations, em todos os ambientes; as pendentes são
    // aplicadas ao subir, numa transação (spec 002, research R1).
    // forRootAsync: as variáveis do .env já foram carregadas pelo ConfigModule
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...opcoesBanco(),
        migrationsRun: true,
        migrationsTransactionMode: 'all',
      }),
    }),
    SaudeModule,
    FazendaModule,
    UsuarioModule,
    PastoModule,
    RacaModule,
    AnimalModule,
    PartoModule,
    TratamentoModule,
    CodigoIdentificacaoModule,
    AuthModule,
    MovimentacaoPastoModule,
    ConfiguracaoModule,
    RelatorioModule,
    VeterinarioModule,
    PesagemModule,
    ConsultaPublicaModule,
    ManejoLoteModule,
    ReproducaoModule,
    // Fase 0: acesso aos módulos pagos e os módulos (por ora, só rotas de exemplo)
    AcessoModule,
    AdminModule,
    LeiteModule,
    FinanceiroModule,
    NutricaoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SenhaProvisoriaGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Depois do login e do papel: bloqueia rotas de módulo pago (spec 002)
    {
      provide: APP_GUARD,
      useExisting: ModuloGuard,
    },
  ],
})
export class AppModule {}