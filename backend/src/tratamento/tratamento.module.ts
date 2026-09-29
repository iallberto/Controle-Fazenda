import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TratamentoService } from './tratamento.service';
import { TratamentoController } from './tratamento.controller';
import { Tratamento } from './entities/tratamento.entity';
import { Animal } from '../animal/entities/animal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tratamento, Animal])],
  controllers: [TratamentoController],
  providers: [TratamentoService],
})
export class TratamentoModule {}