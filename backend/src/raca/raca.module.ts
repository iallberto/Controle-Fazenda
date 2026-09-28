import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RacaService } from './raca.service';
import { RacaController } from './raca.controller';
import { Raca } from './entities/raca.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Raca])],
  controllers: [RacaController],
  providers: [RacaService],
})
export class RacaModule {}