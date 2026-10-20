import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TratamentoService } from './tratamento.service';
import { TratamentoController } from './tratamento.controller';
import { Tratamento } from './entities/tratamento.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Veterinario } from '../veterinario/entities/veterinario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tratamento, Animal, Usuario, Veterinario])],
  controllers: [TratamentoController],
  providers: [TratamentoService],
})
export class TratamentoModule {}