import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodigoIdentificacaoService } from './codigo-identificacao.service';
import { CodigoIdentificacaoController } from './codigo-identificacao.controller';
import { CodigoIdentificacao } from './entities/codigo-identificacao.entity';
import { Animal } from '../animal/entities/animal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CodigoIdentificacao, Animal])],
  controllers: [CodigoIdentificacaoController],
  providers: [CodigoIdentificacaoService],
})
export class CodigoIdentificacaoModule {}