import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelatorioService } from './relatorio.service';
import { RelatorioController } from './relatorio.controller';
import { Animal } from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';
import { Tratamento } from '../tratamento/entities/tratamento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Animal, Parto, Tratamento])],
  controllers: [RelatorioController],
  providers: [RelatorioService],
})
export class RelatorioModule {}