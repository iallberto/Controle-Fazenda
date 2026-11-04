import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Animal } from '../../animal/entities/animal.entity';
import { Pasto } from '../../pasto/entities/pasto.entity';
import { Pesagem } from '../../pesagem/entities/pesagem.entity';
import { ValorArrobaCategoria } from '../../configuracao/entities/valor-arroba-categoria.entity';
import { CategoriaFinanceira } from './entities/categoria-financeira.entity';
import { Lancamento } from './entities/lancamento.entity';
import { ItemVenda, VendaAnimais } from './entities/venda-animais.entity';
import { CompraAnimal } from './entities/compra-animal.entity';
import { RegistroUso } from './entities/registro-uso.entity';
import { CategoriasService } from './categorias.service';
import { LancamentosService } from './lancamentos.service';
import { CategoriasController } from './categorias.controller';
import { LancamentosController } from './lancamentos.controller';
import { VendasService } from './vendas.service';
import { VendasController } from './vendas.controller';

// Módulo pago Financeiro (spec 003). Importa o pacote inicial quando precisa;
// o pacote inicial nunca importa o Financeiro (teste de fronteira, spec 002).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoriaFinanceira,
      Lancamento,
      VendaAnimais,
      ItemVenda,
      CompraAnimal,
      RegistroUso,
      Animal,
      Pasto,
      Pesagem,
      ValorArrobaCategoria,
    ]),
  ],
  controllers: [CategoriasController, LancamentosController, VendasController],
  providers: [CategoriasService, LancamentosService, VendasService],
})
export class FinanceiroModule {}
