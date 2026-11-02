import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AplicadoPorTipo, Tratamento } from './entities/tratamento.entity';
import { Animal } from '../animal/entities/animal.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Veterinario } from '../veterinario/entities/veterinario.entity';
import { CreateTratamentoDto } from './dto/create-tratamento.dto';
import { UpdateTratamentoDto } from './dto/update-tratamento.dto';
import { garantirAnimalAtivo } from '../common/vinculos';
import { formatarDataLocal } from '../common/datas';

@Injectable()
export class TratamentoService {
  constructor(
    @InjectRepository(Tratamento)
    private readonly tratamentoRepository: Repository<Tratamento>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Veterinario)
    private readonly veterinarioRepository: Repository<Veterinario>,
  ) {}

  async create(fazendaId: string, usuarioLogadoId: string, dto: CreateTratamentoDto) {
    const animal = await this.animalRepository.findOneBy({ id: dto.animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }
    garantirAnimalAtivo(animal);

    await this.validarAplicador(
      fazendaId,
      dto.aplicadoPorTipo,
      dto.aplicadoPorUsuarioId,
      dto.aplicadoPorVeterinarioId,
    );

    const tratamento = this.tratamentoRepository.create({
      animalId: dto.animalId,
      produto: dto.produto,
      data: dto.data,
      recorrenciaDias: dto.recorrenciaDias ?? null,
      proximaDataPrevista: this.calcularProximaData(dto.data, dto.recorrenciaDias),
      aplicadoPorTipo: dto.aplicadoPorTipo,
      aplicadoPorUsuarioId:
        dto.aplicadoPorTipo === AplicadoPorTipo.USUARIO ? dto.aplicadoPorUsuarioId! : null,
      aplicadoPorVeterinarioId:
        dto.aplicadoPorTipo === AplicadoPorTipo.VETERINARIO ? dto.aplicadoPorVeterinarioId! : null,
      lancadoPorId: usuarioLogadoId,
    });
    return this.tratamentoRepository.save(tratamento);
  }

  findAll(fazendaId: string, animalId?: string) {
    const where = animalId
      ? { animalId, animal: { fazendaId } }
      : { animal: { fazendaId } };
    return this.tratamentoRepository.find({ where });
  }

  async findOne(fazendaId: string, id: string) {
    const tratamento = await this.tratamentoRepository.findOne({
      where: { id },
      relations: { animal: true },
    });
    if (!tratamento || tratamento.animal.fazendaId !== fazendaId) {
      throw new NotFoundException(`Tratamento ${id} não encontrado`);
    }
    return tratamento;
  }

  async update(fazendaId: string, id: string, dto: UpdateTratamentoDto) {
    const tratamento = await this.findOne(fazendaId, id);
    const { aplicadoPorTipo, aplicadoPorUsuarioId, aplicadoPorVeterinarioId, ...demais } = dto;

    if (
      aplicadoPorTipo !== undefined ||
      aplicadoPorUsuarioId !== undefined ||
      aplicadoPorVeterinarioId !== undefined
    ) {
      const tipo = aplicadoPorTipo ?? tratamento.aplicadoPorTipo;
      const usuarioId = aplicadoPorUsuarioId ?? tratamento.aplicadoPorUsuarioId ?? undefined;
      const veterinarioId =
        aplicadoPorVeterinarioId ?? tratamento.aplicadoPorVeterinarioId ?? undefined;
      await this.validarAplicador(fazendaId, tipo, usuarioId, veterinarioId);
      // Mantém só o aplicador correspondente ao tipo
      tratamento.aplicadoPorTipo = tipo;
      tratamento.aplicadoPorUsuarioId = tipo === AplicadoPorTipo.USUARIO ? usuarioId! : null;
      tratamento.aplicadoPorVeterinarioId =
        tipo === AplicadoPorTipo.VETERINARIO ? veterinarioId! : null;
    }

    Object.assign(tratamento, demais);

    const novaData = dto.data ?? tratamento.data;
    const novaRecorrencia = dto.recorrenciaDias ?? tratamento.recorrenciaDias;
    tratamento.proximaDataPrevista = this.calcularProximaData(novaData, novaRecorrencia);

    return this.tratamentoRepository.save(tratamento);
  }

  private async validarAplicador(
    fazendaId: string,
    tipo: AplicadoPorTipo,
    usuarioId?: string,
    veterinarioId?: string,
  ) {
    if (tipo === AplicadoPorTipo.USUARIO) {
      const usuario = usuarioId ? await this.usuarioRepository.findOneBy({ id: usuarioId }) : null;
      if (!usuario || usuario.fazendaId !== fazendaId) {
        throw new NotFoundException('Usuário informado como aplicador não encontrado');
      }
    } else {
      const veterinario = veterinarioId
        ? await this.veterinarioRepository.findOneBy({ id: veterinarioId })
        : null;
      if (!veterinario || veterinario.fazendaId !== fazendaId) {
        throw new NotFoundException('Veterinário informado não encontrado');
      }
      if (!veterinario.ativo) {
        throw new BadRequestException('Este veterinário está inativo');
      }
    }
  }

  private calcularProximaData(data: string, recorrenciaDias?: number | null): string | null {
    if (!recorrenciaDias) {
      return null;
    }
    const base = new Date(data + 'T00:00:00');
    base.setDate(base.getDate() + recorrenciaDias);
    return formatarDataLocal(base);
  }
}