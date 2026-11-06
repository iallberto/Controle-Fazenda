import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FazendaService } from './fazenda.service';
import { FazendaController } from './fazenda.controller';
import { Fazenda } from './entities/fazenda.entity';
import { AcessoModule } from '../modulos/acesso/acesso.module';
import { AcessoFazendaService } from './acesso-fazenda.service';
import { PrecoPlano } from '../modulos/admin/entities/preco-plano.entity';
import { RegistroAcesso } from '../modulos/admin/entities/registro-acesso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fazenda, PrecoPlano, RegistroAcesso]), AcessoModule],
  controllers: [FazendaController],
  providers: [FazendaService, AcessoFazendaService],
  exports: [AcessoFazendaService],
})
export class FazendaModule {}