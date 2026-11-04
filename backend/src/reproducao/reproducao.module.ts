import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReproducaoController } from './reproducao.controller';
import { EstacaoService } from './estacao.service';
import { DiagnosticoService } from './diagnostico.service';
import { SituacaoService } from './situacao.service';
import { InseminacaoService } from './inseminacao.service';
import { IndicadoresService } from './indicadores.service';
import { EstacaoMonta } from './entities/estacao-monta.entity';
import { ExposicaoMonta } from './entities/exposicao-monta.entity';
import { ExcecaoEstacao } from './entities/excecao-estacao.entity';
import { Semen } from './entities/semen.entity';
import { Inseminacao } from './entities/inseminacao.entity';
import { DiagnosticoGestacao } from './entities/diagnostico-gestacao.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Parto } from '../parto/entities/parto.entity';
import { Pasto } from '../pasto/entities/pasto.entity';
import { Raca } from '../raca/entities/raca.entity';
import { PartoCandidatoPai } from './entities/parto-candidato-pai.entity';
import { TratamentoModule } from '../tratamento/tratamento.module';

// Cobertura e inseminação: parte do pacote inicial (sem @Modulo de módulo pago)
@Module({
  imports: [
    TypeOrmModule.forFeature([
      EstacaoMonta,
      ExposicaoMonta,
      ExcecaoEstacao,
      Semen,
      Inseminacao,
      DiagnosticoGestacao,
      Animal,
      Parto,
      Pasto,
      Raca,
      PartoCandidatoPai,
    ]),
    TratamentoModule,
  ],
  controllers: [ReproducaoController],
  providers: [
    EstacaoService,
    SituacaoService,
    DiagnosticoService,
    InseminacaoService,
    IndicadoresService,
  ],
  exports: [SituacaoService, IndicadoresService],
})
export class ReproducaoModule {}
