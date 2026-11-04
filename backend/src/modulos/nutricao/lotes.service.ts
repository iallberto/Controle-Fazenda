import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In, IsNull } from 'typeorm';
import { Animal, StatusAnimal } from '../../animal/entities/animal.entity';
import { hojeLocal } from '../../common/datas';
import { Dieta } from './entities/dieta.entity';
import { LoteAlimentacao, LoteAnimal } from './entities/lote-alimentacao.entity';
import { noLoteNaData, normalizarNome } from './dominio/regras';
import { CriarLoteDto, EditarLoteDto } from './dto/nutricao.dto';

const porBrinco = (a: { brinco: string }, b: { brinco: string }) =>
  a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true });

// Lotes de alimentação (spec 005, FR-010a, FR-010b; research R4). O dono cria
// e escolhe a dieta; dono e funcionário incluem e tiram animais.
@Injectable()
export class LotesService {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  async listar(fazendaId: string, incluirInativos = false, hoje = hojeLocal()) {
    const lotes = await this.manager.find(LoteAlimentacao, {
      where: incluirInativos ? { fazendaId } : { fazendaId, ativo: true },
      relations: { dieta: true },
      order: { nome: 'ASC' },
    });
    const membros = lotes.length
      ? await this.manager.find(LoteAnimal, { where: { loteId: In(lotes.map((l) => l.id)) } })
      : [];
    return lotes.map((l) => ({
      id: l.id,
      nome: l.nome,
      ativo: l.ativo,
      dieta: l.dieta ? { id: l.dieta.id, nome: l.dieta.nome } : null,
      animais: membros.filter((m) => m.loteId === l.id && noLoteNaData(m, hoje)).length,
    }));
  }

  // Animais no lote na data (padrão hoje)
  async detalhar(fazendaId: string, id: string, data = hojeLocal()) {
    const lote = await this.buscar(fazendaId, id);
    const membros = await this.manager.find(LoteAnimal, {
      where: { loteId: id },
      relations: { animal: { pastoAtual: true } },
    });
    return {
      id: lote.id,
      nome: lote.nome,
      ativo: lote.ativo,
      dietaId: lote.dietaId,
      data,
      animais: membros
        .filter((m) => noLoteNaData(m, data))
        .map((m) => ({
          animalId: m.animalId,
          brinco: m.animal?.brinco ?? '',
          categoria: m.animal?.categoria ?? null,
          sexo: m.animal?.sexo ?? null,
          pasto: m.animal?.pastoAtual?.nome ?? null,
          desde: m.entrada,
        }))
        .sort(porBrinco),
    };
  }

  // Animais em cada lote na data, para o fornecimento
  async animaisNaData(loteId: string, data: string) {
    const membros = await this.manager.find(LoteAnimal, { where: { loteId } });
    return membros.filter((m) => noLoteNaData(m, data)).length;
  }

  async criar(fazendaId: string, usuarioId: string, dto: CriarLoteDto) {
    await this.garantirNomeLivre(fazendaId, dto.nome);
    if (dto.dietaId) await this.validarDieta(fazendaId, dto.dietaId);
    const lote = await this.manager.save(
      this.manager.create(LoteAlimentacao, {
        fazendaId,
        nome: dto.nome,
        dietaId: dto.dietaId ?? null,
        ativo: true,
        criadoPorId: usuarioId,
      }),
    );
    return { id: lote.id, nome: lote.nome };
  }

  async editar(fazendaId: string, usuarioId: string, id: string, dto: EditarLoteDto) {
    const lote = await this.buscar(fazendaId, id);
    if (dto.nome !== undefined && normalizarNome(dto.nome) !== normalizarNome(lote.nome)) {
      await this.garantirNomeLivre(fazendaId, dto.nome, id);
      lote.nome = dto.nome;
    }
    if (dto.dietaId !== undefined) {
      if (dto.dietaId) await this.validarDieta(fazendaId, dto.dietaId);
      lote.dietaId = dto.dietaId;
    }
    if (dto.ativo !== undefined) lote.ativo = dto.ativo;
    lote.atualizadoPorId = usuarioId;
    await this.manager.update(
      LoteAlimentacao,
      { id },
      { nome: lote.nome, dietaId: lote.dietaId, ativo: lote.ativo, atualizadoPorId: usuarioId },
    );
    return { id, nome: lote.nome, dietaId: lote.dietaId, ativo: lote.ativo };
  }

  // Inclui animais (ativos, da fazenda); quem estava em outro lote sai dele na data
  async incluir(
    fazendaId: string,
    usuarioId: string,
    id: string,
    animalIds: string[],
    data = hojeLocal(),
    hoje = hojeLocal(),
  ) {
    if (data > hoje) throw new BadRequestException('A data não pode ser no futuro');
    const lote = await this.buscar(fazendaId, id);
    if (!lote.ativo) throw new BadRequestException('O lote está desativado');
    const ids = [...new Set(animalIds)];
    const animais = await this.manager.find(Animal, { where: { id: In(ids) } });
    for (const animalId of ids) {
      const animal = animais.find((a) => a.id === animalId);
      if (!animal || animal.fazendaId !== fazendaId) throw new NotFoundException('Animal não encontrado');
      if (animal.status !== StatusAnimal.ATIVO) {
        throw new BadRequestException(`O animal ${animal.brinco} não está no rebanho`);
      }
    }
    return this.manager.transaction(async (manager) => {
      const abertos = await manager.find(LoteAnimal, {
        where: { animalId: In(ids), saida: IsNull() },
      });
      let incluidos = 0;
      for (const animalId of ids) {
        const aberto = abertos.find((m) => m.animalId === animalId);
        if (aberto?.loteId === id) continue;
        if (aberto) {
          if (aberto.entrada > data) {
            throw new BadRequestException('O animal entrou no lote atual depois dessa data');
          }
          aberto.saida = data;
          aberto.retiradoPorId = usuarioId;
          await manager.save(aberto);
        }
        await manager.save(
          manager.create(LoteAnimal, {
            loteId: id,
            animalId,
            entrada: data,
            saida: null,
            incluidoPorId: usuarioId,
            retiradoPorId: null,
          }),
        );
        incluidos++;
      }
      return { incluidos };
    });
  }

  async remover(
    fazendaId: string,
    usuarioId: string,
    id: string,
    animalIds: string[],
    data = hojeLocal(),
    hoje = hojeLocal(),
  ) {
    if (data > hoje) throw new BadRequestException('A data não pode ser no futuro');
    await this.buscar(fazendaId, id);
    const abertos = await this.manager.find(LoteAnimal, {
      where: { loteId: id, animalId: In(animalIds), saida: IsNull() },
    });
    for (const membro of abertos) {
      membro.saida = data < membro.entrada ? membro.entrada : data;
      membro.retiradoPorId = usuarioId;
    }
    await this.manager.save(abertos);
    return { removidos: abertos.length };
  }

  async buscar(fazendaId: string, id: string) {
    const lote = await this.manager.findOne(LoteAlimentacao, { where: { id } });
    if (!lote || lote.fazendaId !== fazendaId) throw new NotFoundException('Lote não encontrado');
    return lote;
  }

  private async validarDieta(fazendaId: string, dietaId: string) {
    const dieta = await this.manager.findOne(Dieta, { where: { id: dietaId } });
    if (!dieta || dieta.fazendaId !== fazendaId) throw new NotFoundException('Dieta não encontrada');
    if (!dieta.ativa) throw new BadRequestException('A dieta está desativada');
  }

  private async garantirNomeLivre(fazendaId: string, nome: string, exceto?: string) {
    const lotes = await this.manager.find(LoteAlimentacao, { where: { fazendaId } });
    if (lotes.some((l) => l.id !== exceto && normalizarNome(l.nome) === normalizarNome(nome))) {
      throw new ConflictException('Já existe um lote com este nome');
    }
  }
}
