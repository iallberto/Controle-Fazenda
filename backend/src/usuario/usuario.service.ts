import { Injectable, NotFoundException, ConflictException,ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async create(fazendaId: string, dto: CreateUsuarioDto) {
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
    });

    return this.usuarioRepository.save(usuario);
  }

  findAll(fazendaId: string) {
    return this.usuarioRepository.find({ where: { fazendaId } });
  }

  async findOne(fazendaId: string, id: string) {
    const usuario = await this.usuarioRepository.findOneBy({ id });
    if (!usuario) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    if (usuario.fazendaId !== fazendaId) {
      throw new ForbiddenException('Este usuário não pertence à sua fazenda');
    }
    return usuario;
  }

  async update(fazendaId: string, id: string, dto: UpdateUsuarioDto) {
    const usuario = await this.findOne(fazendaId, id);
    Object.assign(usuario, dto);
    return this.usuarioRepository.save(usuario);
  }
}