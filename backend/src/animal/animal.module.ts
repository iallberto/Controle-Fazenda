import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalService } from './animal.service';
import { AnimalController } from './animal.controller';
import { Animal } from './entities/animal.entity';
import { CodigoIdentificacao } from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';
import { Pasto } from '../pasto/entities/pasto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Animal, CodigoIdentificacao, MovimentacaoPasto, Pasto])],
  controllers: [AnimalController],
  providers: [AnimalService],
})
export class AnimalModule {}