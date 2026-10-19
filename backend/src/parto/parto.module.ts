import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartoService } from './parto.service';
import { PartoController } from './parto.controller';
import { Parto } from './entities/parto.entity';
import { Animal } from '../animal/entities/animal.entity';
import { CodigoIdentificacao } from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { MovimentacaoPasto } from '../movimentacao-pasto/entities/movimentacao-pasto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parto, Animal, CodigoIdentificacao, MovimentacaoPasto])],
  controllers: [PartoController],
  providers: [PartoService],
})
export class PartoModule {}