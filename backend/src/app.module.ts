import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { MovimentacaoPastoModule } from './movimentacao-pasto/movimentacao-pasto.module';
import { ConfiguracaoModule } from './configuracao/configuracao.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
    }),
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
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}