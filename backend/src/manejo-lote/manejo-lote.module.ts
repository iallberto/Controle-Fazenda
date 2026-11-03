import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManejoLoteController } from './manejo-lote.controller';
import { ManejoLoteService } from './manejo-lote.service';
import { SessaoManejo } from './entities/sessao-manejo.entity';
import { SessaoManejoExcecao } from './entities/sessao-manejo-excecao.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { TratamentoModule } from '../tratamento/tratamento.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessaoManejo,
      SessaoManejoExcecao,
      Animal,
      Pasto,
    ]),
    TratamentoModule,
  ],
  controllers: [ManejoLoteController],
  providers: [ManejoLoteService],
})
export class ManejoLoteModule {}
