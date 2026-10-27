import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReemitirCodigoDto {
  @IsUUID()
  animalId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string; 

}