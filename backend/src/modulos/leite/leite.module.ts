import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { ReproducaoModule } from '../../reproducao/reproducao.module';
import { SecagensService } from './secagens.service';
import { SecagensController } from './secagens.controller';
import { EntregasService } from './entregas.service';
import { EntregasController } from './entregas.controller';
import { AnalisesService } from './analises.service';
import { AnalisesController } from './analises.controller';
import { ProducaoService } from './producao.service';
import { ProducaoController } from './producao.controller';
import { GanchosLeite } from './ganchos-leite';
import { ConfiguracaoLeiteService } from './configuracao.service';
import { ConfiguracaoLeiteController } from './configuracao.controller';
import { VacasService } from './vacas.service';
import { VacasController } from './vacas.controller';
import { LactacoesService } from './lactacoes.service';
import { LactacoesController } from './lactacoes.controller';
import { OrdenhasService } from './ordenhas.service';
import { OrdenhasController } from './ordenhas.controller';
import { ProdutosService } from './produtos.service';
import { ProdutosController } from './produtos.controller';
import { CarenciasService } from './carencias.service';
import { CarenciasController } from './carencias.controller';

// Módulo pago Leite (spec 004). Usa o pacote inicial (animal, parto,
// tratamento) e reage a ele pelos ganchos do rebanho (research R1); o pacote
// inicial nunca importa o Leite, e o Leite não importa outro módulo pago.
@Module({
  imports: [AcessoModule, ReproducaoModule],
  controllers: [
    ConfiguracaoLeiteController,
    VacasController,
    LactacoesController,
    OrdenhasController,
    ProdutosController,
    CarenciasController,
    SecagensController,
    EntregasController,
    AnalisesController,
    ProducaoController,
  ],
  providers: [
    GanchosLeite,
    ConfiguracaoLeiteService,
    VacasService,
    LactacoesService,
    OrdenhasService,
    ProdutosService,
    CarenciasService,
    SecagensService,
    EntregasService,
    AnalisesService,
    ProducaoService,
  ],
})
export class LeiteModule {}
