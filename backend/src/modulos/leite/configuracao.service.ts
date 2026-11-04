import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  ConfiguracaoLeite,
  ModoOrdenha,
} from './entities/configuracao-leite.entity';
import { EditarConfiguracaoLeiteDto } from './dto/leite.dto';

// Configurações do Leite (research R8): criadas com o padrão na primeira leitura
@Injectable()
export class ConfiguracaoLeiteService {
  constructor(
    @InjectEntityManager() private readonly manager: EntityManager,
  ) {}

  async obter(fazendaId: string, usuarioId: string) {
    const existente = await this.manager.findOne(ConfiguracaoLeite, {
      where: { fazendaId },
    });
    if (existente) return existente;
    return this.manager.save(
      this.manager.create(ConfiguracaoLeite, {
        fazendaId,
        modo: ModoOrdenha.POR_VACA,
        ordenhasPorDia: 2,
        prazoSecagemDias: 60,
        janelaSecarDias: 15,
        criadoPorId: usuarioId,
      }),
    );
  }

  async editar(
    fazendaId: string,
    usuarioId: string,
    dto: EditarConfiguracaoLeiteDto,
  ) {
    const configuracao = await this.obter(fazendaId, usuarioId);
    Object.assign(configuracao, dto, { atualizadoPorId: usuarioId });
    return this.manager.save(configuracao);
  }
}
