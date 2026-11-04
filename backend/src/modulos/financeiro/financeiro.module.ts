import { Module } from '@nestjs/common';
import { FinanceiroExemploController } from './exemplo.controller';

// Módulo pago Financeiro (decisão D2). Isolado: não importa outros módulos pagos.
@Module({
  controllers: [FinanceiroExemploController],
})
export class FinanceiroModule {}
