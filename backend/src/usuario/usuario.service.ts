import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { PapelUsuario, Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { gerarSenhaProvisoria } from '../auth/senha-provisoria';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(fazendaId: string, usuarioLogadoId: string | null, dto: CreateUsuarioDto) {
    const emailExistente = await this.usuarioRepository.findOneBy({ email: dto.email });
    if (emailExistente) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const usuario = this.usuarioRepository.create({
      fazendaId,
      nome: dto.nome,
      email: dto.email,
      senhaHash,
      papel: dto.papel,
      criadoPorId: usuarioLogadoId,
    });

    return this.usuarioRepository.save(usuario);
  }

  findAll(fazendaId: string) {
    return this.usuarioRepository.find({ where: { fazendaId } });
  }

  // Lista enxuta para escolher "quem aplicou" um tratamento: qualquer usuário da
  // fazenda pode ver, então só vai id, nome e papel (sem e-mail), e só ativos.
  async listarAplicadores(fazendaId: string) {
    const usuarios = await this.usuarioRepository.find({
      where: { fazendaId, ativo: true },
      order: { nome: 'ASC' },
    });
    return usuarios.map(({ id, nome, papel }) => ({ id, nome, papel }));
  }

  async findOne(fazendaId: string, id: string) {
    const usuario = await this.usuarioRepository.findOneBy({ id });
    if (!usuario || usuario.fazendaId !== fazendaId) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    return usuario;
  }

  async update(fazendaId: string, usuarioLogadoId: string, id: string, dto: UpdateUsuarioDto) {
    const usuario = await this.findOne(fazendaId, id);

    if (dto.email && dto.email !== usuario.email) {
      const emailExistente = await this.usuarioRepository.findOneBy({ email: dto.email });
      if (emailExistente) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
    }
    if (
      dto.papel &&
      dto.papel !== PapelUsuario.DONO &&
      usuario.papel === PapelUsuario.DONO
    ) {
      await this.garantirOutroDonoAtivo(fazendaId, usuario.id);
    }

    Object.assign(usuario, dto);
    usuario.atualizadoPorId = usuarioLogadoId;
    return this.usuarioRepository.save(usuario);
  }

  async alterarAtivo(fazendaId: string, usuarioLogadoId: string, id: string, ativo: boolean) {
    const usuario = await this.findOne(fazendaId, id);
    if (!ativo) {
      if (usuario.id === usuarioLogadoId) {
        throw new BadRequestException('Você não pode desativar o próprio usuário');
      }
      if (usuario.papel === PapelUsuario.DONO) {
        await this.garantirOutroDonoAtivo(fazendaId, usuario.id);
      }
    }
    usuario.ativo = ativo;
    usuario.atualizadoPorId = usuarioLogadoId;
    return this.usuarioRepository.save(usuario);
  }

  // O dono redefine a senha de um funcionário que esqueceu (spec 007, FR-003,
  // FR-004, FR-006): senha provisória mostrada uma vez e troca obrigatória no
  // próximo login. As sessões abertas do funcionário deixam de valer.
  async redefinirSenha(fazendaId: string, usuarioLogadoId: string, id: string) {
    const usuario = await this.findOne(fazendaId, id);
    if (usuario.papel === PapelUsuario.DONO) {
      throw new ForbiddenException('A senha de um dono só é redefinida pelo suporte');
    }
    if (!usuario.ativo) {
      throw new BadRequestException('Reative o usuário antes de redefinir a senha');
    }
    const senhaProvisoria = gerarSenhaProvisoria();
    usuario.senhaHash = await bcrypt.hash(senhaProvisoria, 10);
    usuario.precisaTrocarSenha = true;
    usuario.senhaAlteradaEm = new Date();
    usuario.atualizadoPorId = usuarioLogadoId;
    await this.usuarioRepository.save(usuario);
    return { senhaProvisoria };
  }

  // A fazenda nunca pode ficar sem um dono ativo
  private async garantirOutroDonoAtivo(fazendaId: string, usuarioId: string) {
    const donos = await this.usuarioRepository.find({
      where: { fazendaId, papel: PapelUsuario.DONO, ativo: true },
    });
    if (!donos.some((dono) => dono.id !== usuarioId)) {
      throw new BadRequestException('A fazenda precisa ter ao menos um dono ativo');
    }
  }
}