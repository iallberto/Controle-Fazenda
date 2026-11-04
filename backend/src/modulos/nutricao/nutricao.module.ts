import { Module } from '@nestjs/common';
import { NutricaoExemploController } from './exemplo.controller';

// Módulo pago Nutricao (decisão D2). Isolado: não importa outros módulos pagos.
@Module({
  controllers: [NutricaoExemploController],
})
export class NutricaoModule {}
