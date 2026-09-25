import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  async create(dto: CreateUsuarioDto) {
    const emailExistente = await this.usuarioRepository.findOneBy({ email: dto.email });
    if (emailExistente) {
      throw new ConflictException('Já existe um usuário com este e-mail');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);

    const usuario = this.usuarioRepository.create({
      fazendaId: dto.fazendaId,
      nome: dto.nome,
      email: dto.email,
      senhaHash,
      papel: dto.papel,
    });

    return this.usuarioRepository.save(usuario);
  }

  findAll() {
    return this.usuarioRepository.find();
  }

  async findOne(id: string) {
    const usuario = await this.usuarioRepository.findOneBy({ id });
    if (!usuario) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    return usuario;
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    const usuario = await this.findOne(id);
    Object.assign(usuario, dto);
    return this.usuarioRepository.save(usuario);
  }
}