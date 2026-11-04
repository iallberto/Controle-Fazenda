import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuloFazenda } from './entities/modulo-fazenda.entity';
import { AcessoModulosService } from './acesso-modulos.service';
import { ModuloGuard } from './modulo.guard';

// Infraestrutura de acesso aos módulos pagos (spec 002). O ModuloGuard é
// registrado como guard global no AppModule.
@Module({
  imports: [TypeOrmModule.forFeature([ModuloFazenda])],
  providers: [AcessoModulosService, ModuloGuard],
  exports: [AcessoModulosService, ModuloGuard],
})
export class AcessoModule {}
