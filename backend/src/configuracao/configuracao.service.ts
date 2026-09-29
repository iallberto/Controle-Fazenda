import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracaoFazenda } from './entities/configuracao-fazenda.entity';
import {
  ValorArrobaCategoria,
} from './entities/valor-arroba-categoria.entity';
import { CategoriaAnimal } from '../animal/entities/animal.entity';
import { AtualizarPreferenciasDto } from './dto/atualizar-preferencias.dto';
import { AtualizarValorArrobaDto } from './dto/atualizar-valor-arroba.dto';

const VALORES_ARROBA_PADRAO: Record<CategoriaAnimal, number> = {
  [CategoriaAnimal.BEZERRO]: 12,
  [CategoriaAnimal.NOVILHA]: 13,
  [CategoriaAnimal.MATRIZ]: 15,
  [CategoriaAnimal.TOURO]: 15,
};

@Injectable()
export class ConfiguracaoService {
  constructor(
    @InjectRepository(ConfiguracaoFazenda)
    private readonly configuracaoRepository: Repository<ConfiguracaoFazenda>,
    @InjectRepository(ValorArrobaCategoria)
    private readonly valorArrobaRepository: Repository<ValorArrobaCategoria>,
  ) {}

  async obterOuCriar(fazendaId: string) {
    let configuracao = await this.configuracaoRepository.findOne({
      where: { fazendaId },
      relations: { valoresArroba: true },
    });

    if (!configuracao) {
      configuracao = await this.configuracaoRepository.save(
        this.configuracaoRepository.create({ fazendaId }),
      );

      const valores = Object.entries(VALORES_ARROBA_PADRAO).map(([categoria, peso]) =>
        this.valorArrobaRepository.create({
          configuracaoFazendaId: configuracao!.id,
          categoria: categoria as CategoriaAnimal,
          pesoReferenciaKg: peso,
        }),
      );
      await this.valorArrobaRepository.save(valores);

      configuracao = await this.configuracaoRepository.findOne({
        where: { fazendaId },
        relations: { valoresArroba: true },
      });
    }

    return configuracao;
  }

  async atualizarPreferencias(fazendaId: string, dto: AtualizarPreferenciasDto) {
    const configuracao = await this.obterOuCriar(fazendaId);
    Object.assign(configuracao!, dto);
    return this.configuracaoRepository.save(configuracao!);
  }

  async atualizarValorArroba(
    fazendaId: string,
    categoria: CategoriaAnimal,
    dto: AtualizarValorArrobaDto,
  ) {
    const configuracao = await this.obterOuCriar(fazendaId);

    const valor = await this.valorArrobaRepository.findOneBy({
      configuracaoFazendaId: configuracao!.id,
      categoria,
    });
    if (!valor) {
      throw new NotFoundException('Categoria de valor de arroba não encontrada');
    }

    valor.pesoReferenciaKg = dto.pesoReferenciaKg;
    return this.valorArrobaRepository.save(valor);
  }
}