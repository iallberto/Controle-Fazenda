import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

// Códigos para o PDF das etiquetas (spec 008, FR-009): os escolhidos ou uma
// faixa de números
export class EtiquetasQueryDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  ids?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroDe?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroAte?: number;
}
