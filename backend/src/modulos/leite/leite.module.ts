import { Module } from '@nestjs/common';
import { LeiteExemploController } from './exemplo.controller';

// Módulo pago Leite (decisão D2). Isolado: não importa outros módulos pagos.
@Module({
  controllers: [LeiteExemploController],
})
export class LeiteModule {}
