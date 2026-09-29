import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracaoService } from './configuracao.service';
import { ConfiguracaoController } from './configuracao.controller';
import { ConfiguracaoFazenda } from './entities/configuracao-fazenda.entity';
import { ValorArrobaCategoria } from './entities/valor-arroba-categoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracaoFazenda, ValorArrobaCategoria])],
  controllers: [ConfiguracaoController],
  providers: [ConfiguracaoService],
})
export class ConfiguracaoModule {}