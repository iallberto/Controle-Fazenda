import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PesagemService } from './pesagem.service';
import { PesagemController } from './pesagem.controller';
import { Pesagem } from './entities/pesagem.entity';
import { Animal } from '../animal/entities/animal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pesagem, Animal])],
  controllers: [PesagemController],
  providers: [PesagemService],
})
export class PesagemModule {}