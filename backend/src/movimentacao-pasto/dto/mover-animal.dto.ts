import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class MoverAnimalDto {
  @IsUUID()
  animalId: string;

  @IsUUID()
  pastoId: string;

  @IsOptional()
  @IsDateString()
  data?: string;
}