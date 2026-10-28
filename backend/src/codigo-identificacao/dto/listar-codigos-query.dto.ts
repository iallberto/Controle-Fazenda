import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StatusCodigo } from '../entities/codigo-identificacao.entity';

export class ListarCodigosQueryDto {
  @IsOptional()
  @IsEnum(StatusCodigo)
  status?: StatusCodigo;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  de?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ate?: number;
}