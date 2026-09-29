import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimentacaoPastoService } from './movimentacao-pasto.service';
import { MovimentacaoPastoController } from './movimentacao-pasto.controller';
import { MovimentacaoPasto } from './entities/movimentacao-pasto.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MovimentacaoPasto, Animal, Pasto])],
  controllers: [MovimentacaoPastoController],
  providers: [MovimentacaoPastoService],
})
export class MovimentacaoPastoModule {}