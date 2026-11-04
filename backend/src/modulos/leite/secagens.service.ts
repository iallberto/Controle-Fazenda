import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Between, EntityManager, In, IsNull } from 'typeorm';
import { Animal, StatusAnimal } from '../../animal/entities/animal.entity';
import { SituacaoService } from '../../reproducao/situacao.service';
import { hojeLocal } from '../../common/datas';
import { somarDias } from '../../reproducao/dominio/datas';
import { Lactacao, MotivoFimLactacao } from './entities/lactacao.entity';
import { Secagem } from './entities/secagem.entity';
import { Ordenha, TipoOrdenha } from './entities/ordenha.entity';
import { calcularDel, secagemPlanejada } from './dominio/regras';
import { encerrarLactacao, lactacaoAberta } from './lactacao-base';
import { ConfiguracaoLeiteService } from './configuracao.service';
import { RegistrarSecagemDto } from './dto/leite.dto';

const arredondar = (valor: number) => Math.round(valor * 10) / 10;

// Secagem planejada e real (spec 004, US3, FR-019 a FR-021; research R7)
@Injectable()
export class SecagensService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
    private readonly situacaoService: SituacaoService,
    private readonly configuracaoService: ConfiguracaoLeiteService,
  ) {}

  // Secagem planejada de cada vaca (parto previsto − prazo), para as vacas dadas
  async planejadas(fazendaId: string, vacas: Animal[]) {
    const resultado = new Map<string, { partoPrevisto: string; secagem: string }>();
    if (vacas.length === 0) return resultado;
    const [configuracao, previsoes] = await Promise.all([
      this.configuracaoService.valores(fazendaId),
      this.situacaoService.previsoesParto(vacas),
    ]);
    for (const [animalId, previsao] of previsoes) {
      const secagem = secagemPlanejada(previsao.data, configuracao.prazoSecagemDias);
      if (secagem) resultado.set(animalId, { partoPrevisto: previsao.data, secagem });
    }
    return resultado;
  }

  // Vacas em lactação com secagem planejada até hoje + janela; atrasadas
  // primeiro, porque a lista vem em ordem de data (FR-020)
  async aSecar(fazendaId: string, dias?: number, hoje = hojeLocal()) {
    const configuracao = await this.configuracaoService.valores(fazendaId);
    const janela = dias ?? configuracao.janelaSecarDias;
    const lactacoes = await this.manager.find(Lactacao, {
      where: { fazendaId, fim: IsNull() },
      relations: { animal: true },
    });
    const vacas = lactacoes
      .map((l) => l.animal!)
      .filter((a) => a && a.status === StatusAnimal.ATIVO);
    const planejadas = await this.planejadas(fazendaId, vacas);
    const limite = somarDias(hoje, janela);
    const ids = [...planejadas.keys()];
    const ordenhas =
      ids.length > 0
        ? await this.manager.find(Ordenha, {
            where: {
              animalId: In(ids),
              tipo: TipoOrdenha.VACA,
              data: Between(somarDias(hoje, -6), hoje),
            },
          })
        : [];

    return lactacoes
      .filter((l) => planejadas.get(l.animalId)?.secagem && planejadas.get(l.animalId)!.secagem <= limite)
      .map((l) => {
        const plano = planejadas.get(l.animalId)!;
        const porDia = new Map<string, number>();
        for (const o of ordenhas) {
          if (o.animalId === l.animalId) porDia.set(o.data, (porDia.get(o.data) ?? 0) + o.litros);
        }
        const dias7 = [...porDia.values()];
        return {
          animalId: l.animalId,
          brinco: l.animal!.brinco,
          del: calcularDel(l.inicio, hoje),
          partoPrevisto: plano.partoPrevisto,
          secagemPlanejada: plano.secagem,
          atrasada: plano.secagem < hoje,
          mediaUltimos7Dias:
            dias7.length > 0 ? arredondar(dias7.reduce((s, v) => s + v, 0) / dias7.length) : null,
        };
      })
      .sort((a, b) => a.secagemPlanejada.localeCompare(b.secagemPlanejada));
  }

  // Registrar a secagem encerra a lactação e tira a vaca da ordenha (FR-021)
  async registrar(
    fazendaId: string,
    usuarioId: string,
    dto: RegistrarSecagemDto,
    hoje = hojeLocal(),
  ) {
    if (dto.data > hoje) {
      throw new BadRequestException('A secagem não pode ser no futuro');
    }
    const animal = await this.manager.findOne(Animal, { where: { id: dto.animalId } });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Vaca não encontrada');
    }
    return this.manager.transaction(async (manager) => {
      const lactacao = await lactacaoAberta(manager, animal.id);
      if (!lactacao) {
        throw new BadRequestException('A vaca não está em lactação');
      }
      if (dto.data < lactacao.inicio) {
        throw new BadRequestException('A secagem não pode ser antes do início da lactação');
      }
      const secagem = await manager.save(
        manager.create(Secagem, {
          fazendaId,
          lactacaoId: lactacao.id,
          data: dto.data,
          observacao: dto.observacao ?? null,
          criadoPorId: usuarioId,
        }),
      );
      await encerrarLactacao(manager, lactacao, dto.data, MotivoFimLactacao.SECAGEM, usuarioId);
      return secagem;
    });
  }

  // Cancelar a secagem reabre a lactação, se ela for a mais nova da vaca
  async cancelar(fazendaId: string, usuarioId: string, id: string, motivo: string) {
    return this.manager.transaction(async (manager) => {
      const secagem = await manager.findOne(Secagem, { where: { id } });
      if (!secagem || secagem.fazendaId !== fazendaId) {
        throw new NotFoundException('Secagem não encontrada');
      }
      if (secagem.cancelamento?.cancelado) {
        throw new BadRequestException('Esta secagem já foi cancelada');
      }
      const lactacao = await manager.findOne(Lactacao, { where: { id: secagem.lactacaoId } });
      if (!lactacao) throw new NotFoundException('Lactação não encontrada');
      const outras = await manager.find(Lactacao, { where: { animalId: lactacao.animalId } });
      if (outras.some((l) => l.id !== lactacao.id && (l.fim === null || l.inicio > lactacao.inicio))) {
        throw new ConflictException(
          'A vaca já tem uma lactação mais nova; a secagem não pode ser desfeita',
        );
      }
      const animal = await manager.findOne(Animal, { where: { id: lactacao.animalId } });
      if (animal?.status !== StatusAnimal.ATIVO) {
        throw new BadRequestException('A vaca não está mais no rebanho');
      }
      secagem.cancelamento = {
        cancelado: true,
        canceladoEm: new Date(),
        canceladoPorId: usuarioId,
        motivoCancelamento: motivo,
      };
      secagem.atualizadoPorId = usuarioId;
      await manager.save(secagem);
      lactacao.fim = null;
      lactacao.motivoFim = null;
      lactacao.atualizadoPorId = usuarioId;
      await manager.save(lactacao);
      return { cancelada: true };
    });
  }

  // Secagem em vigor de cada lactação encerrada por secagem (para o detalhe)
  async daLactacao(lactacaoIds: string[]) {
    if (lactacaoIds.length === 0) return new Map<string, Secagem>();
    const secagens = await this.manager.find(Secagem, {
      where: { lactacaoId: In(lactacaoIds), cancelamento: { cancelado: false } },
    });
    return new Map(secagens.map((s) => [s.lactacaoId, s]));
  }
}
