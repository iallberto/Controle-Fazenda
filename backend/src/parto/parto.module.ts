import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartoService } from './parto.service';
import { PartoController } from './parto.controller';
import { Parto } from './entities/parto.entity';
import { Animal } from '../animal/entities/animal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parto, Animal])],
  controllers: [PartoController],
  providers: [PartoService],
})
export class PartoModule {}