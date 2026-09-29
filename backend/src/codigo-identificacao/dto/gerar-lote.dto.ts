import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class GerarLoteDto {

  @IsInt()
  @Min(1)
  @Max(150)
  quantidade: number;
}