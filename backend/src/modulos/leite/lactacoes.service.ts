import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { StatusAnimal } from '../../animal/entities/animal.entity';
import { Parto } from '../../parto/entities/parto.entity';
import { hojeLocal } from '../../common/datas';
import { Lactacao, OrigemLactacao } from './entities/lactacao.entity';
import { ehVacaDeLeite } from './dominio/regras';
import { IniciarLactacaoDto } from './dto/leite.dto';
import { VacasService } from './vacas.service';

// Início manual da lactação, uma vaca de cada vez (spec 004, FR-006): vacas
// que já davam leite quando o Leite foi liberado, compradas em lactação, ou
// o parto recente oferecido ao marcar "vaca de leite" (FR-004b)
@Injectable()
export class LactacoesService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
    private readonly vacasService: VacasService,
  ) {}

  async iniciar(
    fazendaId: string,
    usuarioId: string,
    dto: IniciarLactacaoDto,
    hoje = hojeLocal(),
  ) {
    if (dto.inicio > hoje) {
      throw new BadRequestException('O início da lactação não pode ser no futuro');
    }
    const vaca = await this.vacasService.buscarFemea(fazendaId, dto.animalId);
    if (vaca.status !== StatusAnimal.ATIVO) {
      throw new BadRequestException('A vaca não está mais no rebanho');
    }
    if (!ehVacaDeLeite(vaca)) {
      throw new BadRequestException(
        'Esta vaca não é de leite: marque "vaca de leite" ou use uma raça leiteira',
      );
    }

    const lactacoes = await this.manager.find(Lactacao, {
      where: { animalId: vaca.id },
    });
    if (lactacoes.some((l) => l.fim === null)) {
      throw new ConflictException('A vaca já está em lactação');
    }
    // Lactações não se sobrepõem: a nova fica aberta a partir do início
    if (lactacoes.some((l) => l.fim! >= dto.inicio)) {
      throw new BadRequestException(
        'Já existe uma lactação registrada nessa data ou depois dela',
      );
    }

    if (dto.partoId) {
      const parto = await this.manager.findOne(Parto, {
        where: { id: dto.partoId, maeId: vaca.id },
      });
      if (!parto) throw new NotFoundException('Parto não encontrado');
    }

    return this.manager.save(
      this.manager.create(Lactacao, {
        fazendaId,
        animalId: vaca.id,
        inicio: dto.inicio,
        origem: dto.partoId ? OrigemLactacao.PARTO : OrigemLactacao.MANUAL,
        partoId: dto.partoId ?? null,
        fim: null,
        motivoFim: null,
        criadoPorId: usuarioId,
      }),
    );
  }
}
