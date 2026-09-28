import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { StatusAnimal } from '../entities/animal.entity';

export class AlterarStatusAnimalDto {
  @IsEnum(StatusAnimal)
  status: StatusAnimal;

  @IsString()
  @IsNotEmpty()
  motivo: string;

  @IsDateString()
  data: string;
}