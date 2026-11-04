import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Animal,
  Sexo,
  StatusAnimal,
  StatusReprodutivo,
} from '../animal/entities/animal.entity';
import { Parto, ResultadoParto } from '../parto/entities/parto.entity';
import { Tratamento } from '../tratamento/entities/tratamento.entity';
import { nomeDoResponsavel } from '../tratamento/tratamento.service';
import { formatarDataLocal, hojeLocal } from '../common/datas';
import { SituacaoService } from '../reproducao/situacao.service';
import { somarDias } from '../reproducao/dominio/datas';

@Injectable()
export class RelatorioService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Parto)
    private readonly partoRepository: Repository<Parto>,
    @InjectRepository(Tratamento)
    private readonly tratamentoRepository: Repository<Tratamento>,
    private readonly situacaoService: SituacaoService,
  ) {}

  // Fêmeas prenhes com parto previsto até hoje + dias, mais as atrasadas (FR-019)
  async vacasAParir(fazendaId: string, dias: number) {
    const hoje = hojeLocal();
    const limite = somarDias(hoje, dias);
    const prenhes = await this.animalRepository.find({
      where: {
        fazendaId,
        status: StatusAnimal.ATIVO,
        sexo: Sexo.F,
        statusReprodutivo: StatusReprodutivo.PRENHE,
      },
      relations: { pastoAtual: true },
    });
    const previsoes = await this.situacaoService.previsoesParto(prenhes);

    return prenhes
      .filter((femea) => {
        const previsao = previsoes.get(femea.id);
        return previsao && previsao.data <= limite;
      })
      .map((femea) => {
        const previsao = previsoes.get(femea.id)!;
        return {
          animal: {
            id: femea.id,
            brinco: femea.brinco,
            categoria: femea.categoria,
          },
          previsaoParto: previsao.data,
          base: previsao.base,
          atrasado: previsao.data < hoje,
          touros: previsao.touros,
          semens: previsao.semens,
          pasto: femea.pastoAtual?.nome ?? null,
        };
      })
      .sort((a, b) => a.previsaoParto.localeCompare(b.previsaoParto));
  }

  async painelInicial(fazendaId: string) {
    const primeiroDiaDoMes = new Date();
    primeiroDiaDoMes.setDate(1);
    const inicioMes = formatarDataLocal(primeiroDiaDoMes);

    const porCategoria = await this.animalRepository
      .createQueryBuilder('animal')
      .select('animal.categoria', 'categoria')
      .addSelect('COUNT(*)', 'total')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.ATIVO })
      .groupBy('animal.categoria')
      .getRawMany();

    const porPasto = await this.animalRepository
      .createQueryBuilder('animal')
      .leftJoin('animal.pastoAtual', 'pasto')
      .select('pasto.nome', 'pasto')
      .addSelect('COUNT(*)', 'total')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.ATIVO })
      .groupBy('pasto.nome')
      .getRawMany();

    // Conta as crias, não os partos: um parto de gêmeos são dois nascimentos
    const nascimentosNoMes = await this.animalRepository
      .createQueryBuilder('cria')
      .innerJoin('cria.parto', 'parto')
      .where('cria.fazendaId = :fazendaId', { fazendaId })
      .andWhere('parto.resultado = :resultado', {
        resultado: ResultadoParto.VIVO,
      })
      .andWhere('parto.data >= :inicioMes', { inicioMes })
      .getCount();

    const obitosNoMes = await this.animalRepository
      .createQueryBuilder('animal')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.MORTO })
      .andWhere('animal.dataStatus >= :inicioMes', { inicioMes })
      .getCount();

    return { porCategoria, porPasto, nascimentosNoMes, obitosNoMes };
  }

  async nascimentosPorPeriodo(fazendaId: string, inicio: string, fim: string) {
    return this.partoRepository
      .createQueryBuilder('parto')
      .innerJoin('parto.mae', 'mae')
      .leftJoinAndSelect('parto.crias', 'crias')
      .where('mae.fazendaId = :fazendaId', { fazendaId })
      .andWhere('parto.resultado = :resultado', {
        resultado: ResultadoParto.VIVO,
      })
      .andWhere('parto.data BETWEEN :inicio AND :fim', { inicio, fim })
      .getMany();
  }

  async natimortos(fazendaId: string, inicio: string, fim: string) {
    return this.partoRepository
      .createQueryBuilder('parto')
      .innerJoin('parto.mae', 'mae')
      .where('mae.fazendaId = :fazendaId', { fazendaId })
      .andWhere('parto.resultado = :resultado', {
        resultado: ResultadoParto.NATIMORTO,
      })
      .andWhere('parto.data BETWEEN :inicio AND :fim', { inicio, fim })
      .getMany();
  }

  async obitosPorCausa(fazendaId: string, inicio: string, fim: string) {
    return this.animalRepository
      .createQueryBuilder('animal')
      .select('animal.motivoStatus', 'motivo')
      .addSelect('COUNT(*)', 'total')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.MORTO })
      .andWhere('animal.dataStatus BETWEEN :inicio AND :fim', { inicio, fim })
      .groupBy('animal.motivoStatus')
      .getRawMany();
  }

  async tratamentosPorPeriodo(fazendaId: string, inicio: string, fim: string) {
    const tratamentos = await this.tratamentoRepository
      .createQueryBuilder('tratamento')
      .innerJoinAndSelect('tratamento.animal', 'animal')
      .leftJoinAndSelect('tratamento.aplicadoPorUsuario', 'usuario')
      .leftJoinAndSelect('tratamento.aplicadoPorVeterinario', 'veterinario')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('tratamento.data BETWEEN :inicio AND :fim', { inicio, fim })
      .orderBy('tratamento.data', 'DESC')
      .getMany();

    return tratamentos.map((tratamento) => ({
      id: tratamento.id,
      produto: tratamento.produto,
      data: tratamento.data,
      animal: { id: tratamento.animal.id, brinco: tratamento.animal.brinco },
      responsavel: nomeDoResponsavel(
        tratamento.aplicadoPorUsuario,
        tratamento.aplicadoPorVeterinario,
      ),
    }));
  }

  // Tratamentos recorrentes cuja próxima dose vence em até `dias` dias, ou já venceu.
  // Considera só a aplicação mais recente de cada produto em cada animal: se a dose
  // seguinte já foi dada, a anterior não aparece mais como pendente.
  async proximosTratamentos(fazendaId: string, dias: number) {
    const hoje = hojeLocal();
    const limite = new Date(`${hoje}T00:00:00`);
    limite.setDate(limite.getDate() + dias);

    const tratamentos = await this.tratamentoRepository
      .createQueryBuilder('tratamento')
      .innerJoinAndSelect('tratamento.animal', 'animal')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.ATIVO })
      .andWhere('tratamento.proximaDataPrevista IS NOT NULL')
      .andWhere('tratamento.proximaDataPrevista <= :limite', {
        limite: formatarDataLocal(limite),
      })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM tratamentos posterior
          WHERE posterior.animal_id = tratamento.animal_id
            AND LOWER(posterior.produto) = LOWER(tratamento.produto)
            AND posterior.data > tratamento.data
        )`,
      )
      .orderBy('tratamento.proximaDataPrevista', 'ASC')
      .getMany();

    return tratamentos.map((tratamento) => ({
      id: tratamento.id,
      produto: tratamento.produto,
      ultimaAplicacao: tratamento.data,
      proximaData: tratamento.proximaDataPrevista!,
      atrasado: tratamento.proximaDataPrevista! < hoje,
      animal: { id: tratamento.animal.id, brinco: tratamento.animal.brinco },
    }));
  }

  // Animais ativos agrupados por raça, com a divisão entre fêmeas e machos
  async porRaca(fazendaId: string) {
    const linhas = await this.animalRepository
      .createQueryBuilder('animal')
      .leftJoin('animal.raca', 'raca')
      .select('raca.nome', 'raca')
      .addSelect('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE animal.sexo = 'F')", 'femeas')
      .addSelect("COUNT(*) FILTER (WHERE animal.sexo = 'M')", 'machos')
      .where('animal.fazendaId = :fazendaId', { fazendaId })
      .andWhere('animal.status = :status', { status: StatusAnimal.ATIVO })
      .groupBy('raca.nome')
      .orderBy('total', 'DESC')
      .getRawMany<{
        raca: string | null;
        total: string;
        femeas: string;
        machos: string;
      }>();

    return linhas.map((linha) => ({
      raca: linha.raca ?? 'Sem raça informada',
      total: Number(linha.total),
      femeas: Number(linha.femeas),
      machos: Number(linha.machos),
    }));
  }
}
