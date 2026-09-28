import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PastoService } from './pasto.service';
import { PastoController } from './pasto.controller';
import { Pasto } from './entities/pasto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pasto])],
  controllers: [PastoController],
  providers: [PastoService],
})
export class PastoModule {}