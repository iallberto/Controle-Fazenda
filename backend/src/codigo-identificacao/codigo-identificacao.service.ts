import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { CodigoIdentificacao, StatusCodigo } from './entities/codigo-identificacao.entity';
import { Animal } from '../animal/entities/animal.entity';
import { GerarLoteDto } from './dto/gerar-lote.dto';
import { VincularCodigoDto } from './dto/vincular-codigo.dto';
import { ReemitirCodigoDto } from './dto/reemitir-codigo.dto';

@Injectable()
export class CodigoIdentificacaoService {
  constructor(
    @InjectRepository(CodigoIdentificacao)
    private readonly codigoRepository: Repository<CodigoIdentificacao>,
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
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
      return manager.save(novoRegistro);
    });
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