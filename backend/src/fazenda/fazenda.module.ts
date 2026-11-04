import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FazendaService } from './fazenda.service';
import { FazendaController } from './fazenda.controller';
import { Fazenda } from './entities/fazenda.entity';
import { AcessoModule } from '../modulos/acesso/acesso.module';

@Module({
  imports: [TypeOrmModule.forFeature([Fazenda]), AcessoModule],
  controllers: [FazendaController],
  providers: [FazendaService],
})
export class FazendaModule {}