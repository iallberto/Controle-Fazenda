import { IsOptional, IsUUID } from 'class-validator';

// Um dos dois: touro do rebanho ou sêmen (o serviço confere)
export class DefinirPaiDto {
  @IsOptional()
  @IsUUID()
  touroId?: string;

  @IsOptional()
  @IsUUID()
  semenId?: string;
}
