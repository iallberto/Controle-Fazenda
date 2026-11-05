import { Module } from '@nestjs/common';
import { GanchosNutricao } from './ganchos-nutricao';
import { InsumosService } from './insumos.service';
import { InsumosController } from './insumos.controller';
import { MovimentosService } from './movimentos.service';
import { MovimentosController } from './movimentos.controller';
import { DietasService } from './dietas.service';
import { DietasController } from './dietas.controller';
import { LotesService } from './lotes.service';
import { LotesController } from './lotes.controller';
import { FornecimentosService } from './fornecimentos.service';
import { FornecimentosController } from './fornecimentos.controller';
import { SilosService } from './silos.service';
import { SilosController } from './silos.controller';
import { CustoService } from './custo.service';
import { CustoController } from './custo.controller';

// Módulo pago Nutrição (spec 005). Usa o pacote inicial (animal, pasto) e
// reage à saída do rebanho pelos ganchos; o pacote inicial nunca importa a
// Nutrição, e a Nutrição não importa outro módulo pago.
@Module({
  controllers: [
    InsumosController,
    MovimentosController,
    DietasController,
    LotesController,
    FornecimentosController,
    SilosController,
    CustoController,
  ],
  providers: [
    GanchosNutricao,
    InsumosService,
    MovimentosService,
    DietasService,
    LotesService,
    FornecimentosService,
    SilosService,
    CustoService,
  ],
})
export class NutricaoModule {}
