import { IsNumber, IsPositive } from 'class-validator';

export class AtualizarValorArrobaDto {
  @IsNumber()
  @IsPositive()
  pesoReferenciaKg: number;
}