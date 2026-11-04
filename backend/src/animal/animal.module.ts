import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalService } from './animal.service';
import { AnimalController } from './animal.controller';
import { Animal } from './entities/animal.entity';
import { CodigoIdentificacao } from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { AcessoModule } from '../modulos/acesso/acesso.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Animal, CodigoIdentificacao, MovimentacaoPasto, Pasto]),
    AcessoModule,
  ],
  controllers: [AnimalController],
  providers: [AnimalService],
  // O Financeiro cadastra animais comprados pelo mesmo serviço (spec 003)
  exports: [AnimalService],
})
export class AnimalModule {}