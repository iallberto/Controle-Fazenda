import { IsUUID } from 'class-validator';

export class VincularCodigoDto {
  @IsUUID()
  animalId: string;
}