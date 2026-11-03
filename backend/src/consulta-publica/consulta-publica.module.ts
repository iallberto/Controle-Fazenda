import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultaPublicaController } from './consulta-publica.controller';
import { ConsultaPublicaService } from './consulta-publica.service';
import { LimitePorIpGuard } from '../common/limite-por-ip.guard';
import { CodigoIdentificacao } from '../codigo-identificacao/entities/codigo-identificacao.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Pesagem } from '../pesagem/entities/pesagem.entity';
import { Tratamento } from '../tratamento/entities/tratamento.entity';
import { ValorArrobaCategoria } from '../configuracao/entities/valor-arroba-categoria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CodigoIdentificacao,
      Animal,
      Pesagem,
      Tratamento,
      ValorArrobaCategoria,
    ]),
  ],
  controllers: [ConsultaPublicaController],
  providers: [ConsultaPublicaService, LimitePorIpGuard],
})
export class ConsultaPublicaModule {}
