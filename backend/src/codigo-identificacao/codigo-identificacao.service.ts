import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { randomBytes } from 'crypto';
import { CodigoIdentificacao, StatusCodigo } from './entities/codigo-identificacao.entity';
import { HistoricoNumero } from './entities/historico-numero.entity';
import { Animal } from '../animal/entities/animal.entity';
import { GerarLoteDto } from './dto/gerar-lote.dto';
import { VincularCodigoDto } from './dto/vincular-codigo.dto';
import { ReemitirCodigoDto } from './dto/reemitir-codigo.dto';
import { ListarCodigosQueryDto } from './dto/listar-codigos-query.dto';

@Injectable()
export class CodigoIdentificacaoService {
  constructor(
    @InjectRepository(CodigoIdentificacao)
    private readonly codigoRepository: Repository<CodigoIdentificacao>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(HistoricoNumero)
    private readonly historicoRepository: Repository<HistoricoNumero>,
  ) {}

  async gerarLote(fazendaId: string, usuarioLogadoId: string, dto: GerarLoteDto) {
    return this.codigoRepository.manager.transaction(async (manager) => {
      const ultimo = await manager.findOne(CodigoIdentificacao, {
        where: { fazendaId },
        order: { numero: 'DESC' },
      });
      let proximoNumero = (ultimo?.numero ?? 0) + 1;

      const codigosGerados: CodigoIdentificacao[] = [];
      for (let i = 0; i < dto.quantidade; i++) {
        const codigo = await this.gerarCodigoUnico();
        const entidade = manager.create(CodigoIdentificacao, {
          fazendaId,
          codigo,
          numero: proximoNumero,
          status: StatusCodigo.DISPONIVEL,
          criadoPorId: usuarioLogadoId,
        });
        codigosGerados.push(await manager.save(entidade));
        proximoNumero++;
      }

      return codigosGerados;
    });
  }

  async listarDisponiveis(fazendaId: string) {
    return this.codigoRepository.find({
      where: { fazendaId, status: StatusCodigo.DISPONIVEL },
      order: { numero: 'ASC' },
    });
  }

  async listar(fazendaId: string, filtro: ListarCodigosQueryDto) {
    // Number() garante o tipo mesmo se o ValidationPipe não estiver com transform ligado
    const de = filtro.de !== undefined ? Number(filtro.de) : undefined;
    const ate = filtro.ate !== undefined ? Number(filtro.ate) : undefined;

    if (de !== undefined && ate !== undefined && de > ate) {
      throw new BadRequestException('A faixa inicial não pode ser maior que a final');
    }

    const where: FindOptionsWhere<CodigoIdentificacao> = { fazendaId };
    if (filtro.status) {
      where.status = filtro.status;
    }
    if (de !== undefined && ate !== undefined) {
      where.numero = Between(de, ate);
    } else if (de !== undefined) {
      where.numero = MoreThanOrEqual(de);
    } else if (ate !== undefined) {
      where.numero = LessThanOrEqual(ate);
    }

    return this.codigoRepository.find({
      where,
      relations: { animal: true },
      order: { numero: 'ASC' },
    });
  }

  async buscarPorCodigo(fazendaId: string, codigo: string) {
    const registro = await this.codigoRepository.findOne({
      where: { codigo },
      relations: { animal: true },
    });

    if (!registro) {
      throw new NotFoundException('Código não encontrado');
    }
    if (registro.fazendaId !== fazendaId) {
      throw new NotFoundException('Código não encontrado');
    }

    if (registro.status === StatusCodigo.DISPONIVEL) {
      return { status: registro.status, mensagem: 'Animal ainda não cadastrado' };
    }

    return registro;
  }

  async buscarPorNumero(fazendaId: string, numeroInformado: string) {
    const numero = this.normalizarNumero(numeroInformado);

    const atual = await this.animalRepository.findOne({
      where: { fazendaId, brinco: numero },
    });
    if (atual) {
      return { animal: atual, numeroBuscado: numero, reemitido: false, aviso: null };
    }

    const historico = await this.historicoRepository.findOne({
      where: { fazendaId, numeroAnterior: numero },
      order: { reemitidoEm: 'DESC' },
    });
    if (!historico) {
      throw new NotFoundException('Animal não encontrado');
    }

    const animal = await this.animalRepository.findOneBy({ id: historico.animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }

    return {
      animal,
      numeroBuscado: numero,
      reemitido: true,
      aviso: `O brinco #${this.formatarNumero(numero)} foi substituído. Agora é o #${this.formatarNumero(animal.brinco)}.`,
    };
  }

  async listarHistoricoDoAnimal(fazendaId: string, animalId: string) {
    const animal = await this.animalRepository.findOneBy({ id: animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }

    return this.historicoRepository.find({
      where: { fazendaId, animalId },
      order: { reemitidoEm: 'DESC' },
    });
  }

  async vincular(fazendaId: string, codigo: string, dto: VincularCodigoDto) {
    const registro = await this.codigoRepository.findOneBy({ codigo });
    if (!registro || registro.fazendaId !== fazendaId) {
      throw new NotFoundException('Código não encontrado');
    }
    if (registro.status !== StatusCodigo.DISPONIVEL) {
      throw new ConflictException('Este código já está vinculado ou foi desativado');
    }

    const animal = await this.animalRepository.findOneBy({ id: dto.animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }

    registro.status = StatusCodigo.VINCULADO;
    registro.animalId = animal.id;
    registro.vinculadoEm = new Date();
    return this.codigoRepository.save(registro);
  }

  async reemitir(fazendaId: string, usuarioLogadoId: string, dto: ReemitirCodigoDto) {
    const animal = await this.animalRepository.findOneBy({ id: dto.animalId });
    if (!animal || animal.fazendaId !== fazendaId) {
      throw new NotFoundException('Animal não encontrado');
    }

    return this.codigoRepository.manager.transaction(async (manager) => {
      const numeroAnterior = animal.brinco;

      const codigoAntigo = await manager.findOne(CodigoIdentificacao, {
        where: { animalId: animal.id, status: StatusCodigo.VINCULADO },
      });
      if (codigoAntigo) {
        codigoAntigo.status = StatusCodigo.DESATIVADO;
        await manager.save(codigoAntigo);
      }

      const ultimo = await manager.findOne(CodigoIdentificacao, {
        where: { fazendaId },
        order: { numero: 'DESC' },
      });
      const proximoNumero = (ultimo?.numero ?? 0) + 1;

      const novoCodigo = await this.gerarCodigoUnico();
      const novoRegistro = manager.create(CodigoIdentificacao, {
        fazendaId,
        codigo: novoCodigo,
        numero: proximoNumero,
        status: StatusCodigo.VINCULADO,
        animalId: animal.id,
        vinculadoEm: new Date(),
        criadoPorId: usuarioLogadoId,
      });
      const codigoSalvo = await manager.save(novoRegistro);

      animal.brinco = String(proximoNumero);
      await manager.save(animal);

      const historico = manager.create(HistoricoNumero, {
        fazendaId,
        animalId: animal.id,
        numeroAnterior,
        numeroNovo: animal.brinco,
        motivo: dto.motivo ?? null,
        reemitidoPorId: usuarioLogadoId,
      });
      await manager.save(historico);

      return codigoSalvo;
    });
  }

  private normalizarNumero(valor: string): string {
    const texto = valor.trim();
    return /^\d+$/.test(texto) ? String(parseInt(texto, 10)) : texto;
  }

  private formatarNumero(valor: string): string {
    return /^\d+$/.test(valor) ? valor.padStart(4, '0') : valor;
  }

  private async gerarCodigoUnico(): Promise<string> {
    let codigo: string;
    let existe: CodigoIdentificacao | null;

    do {
      codigo = randomBytes(4).toString('hex');
      existe = await this.codigoRepository.findOneBy({ codigo });
    } while (existe);

    return codigo;
  }
}