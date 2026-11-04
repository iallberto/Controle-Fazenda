import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { AcessoModule } from '../acesso/acesso.module';
import { ModuloFazenda } from '../acesso/entities/modulo-fazenda.entity';
import { Administrador } from './entities/administrador.entity';
import { TentativaLoginAdmin } from './entities/tentativa-login-admin.entity';
import { SuspensaoFazenda } from './entities/suspensao-fazenda.entity';
import { AdminAuthService } from './admin-auth.service';
import { AdminFazendasService } from './admin-fazendas.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminAuthController, AdminController } from './admin.controller';

// Painel do dono do software (spec 002, US2). Não importa nenhum módulo de
// rebanho: o administrador não tem como ler animais, partos ou pesagens.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Administrador,
      TentativaLoginAdmin,
      SuspensaoFazenda,
      Fazenda,
      Usuario,
      ModuloFazenda,
    ]),
    AcessoModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AdminAuthController, AdminController],
  providers: [AdminAuthService, AdminFazendasService, AdminJwtStrategy],
})
export class AdminModule {}
