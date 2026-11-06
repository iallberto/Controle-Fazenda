import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Fazenda } from '../../fazenda/entities/fazenda.entity';
import { PapelUsuario, Usuario } from '../../usuario/entities/usuario.entity';
import type { JwtPayload } from '../../auth/auth.service';
import { Administrador } from './entities/administrador.entity';
import { DURACAO_SESSAO_SUPORTE_MS, SessaoSuporte } from './entities/sessao-suporte.entity';

// E-mail interno do usuário suporte: identifica o par administrador + fazenda
// (o e-mail é único), é um e-mail válido e nunca recebe mensagens (.invalid).
export function emailDoSuporte(administradorId: string, fazendaId: string) {
  const par = createHash('sha256').update(`${administradorId}:${fazendaId}`).digest('hex').slice(0, 32);
  return `suporte-${par}@suporte.invalid`;
}

// Acesso de suporte (spec 008, R1): o administrador entra na fazenda do cliente
// por um usuário "suporte" próprio daquela fazenda. Assim todas as telas e
// regras do dono funcionam e a autoria sai como "Suporte · <nome>".
@Injectable()
export class SuporteService {
  constructor(
    @InjectRepository(Fazenda)
    private readonly fazendaRepository: Repository<Fazenda>,
    @InjectRepository(Administrador)
    private readonly administradorRepository: Repository<Administrador>,
    @InjectRepository(SessaoSuporte)
    private readonly sessaoRepository: Repository<SessaoSuporte>,
    private readonly jwtService: JwtService,
  ) {}

  async entrar(administradorId: string, fazendaId: string) {
    const fazenda = await this.fazendaRepository.findOneBy({ id: fazendaId });
    if (!fazenda) throw new NotFoundException('Fazenda não encontrada');
    const administrador = await this.administradorRepository.findOneBy({ id: administradorId });
    if (!administrador) throw new NotFoundException('Administrador não encontrado');

    const { usuario, sessao } = await this.fazendaRepository.manager.transaction(async (manager) => {
      const email = emailDoSuporte(administradorId, fazendaId);
      const nome = `Suporte · ${administrador.nome}`;
      let usuario = await manager.findOne(Usuario, { where: { email } });
      if (!usuario) {
        usuario = await manager.save(
          manager.create(Usuario, {
            fazendaId,
            nome,
            email,
            // Ninguém conhece esta senha: o suporte só entra pelo painel
            senhaHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
            papel: PapelUsuario.DONO,
            suporte: true,
            ativo: true,
            criadoPorId: null,
          }),
        );
      } else if (usuario.nome !== nome || !usuario.ativo) {
        usuario.nome = nome;
        usuario.ativo = true;
        usuario = await manager.save(usuario);
      }
      const sessao = await manager.save(
        manager.create(SessaoSuporte, { administradorId, fazendaId, usuarioId: usuario.id }),
      );
      return { usuario, sessao };
    });

    const payload: JwtPayload & { sessaoSuporteId: string } = {
      sub: usuario.id,
      fazendaId,
      papel: PapelUsuario.DONO,
      sessaoSuporteId: sessao.id,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        fazendaId,
        precisaTrocarSenha: false,
        suporte: true,
      },
      fazenda: { id: fazenda.id, nome: fazenda.nome, suspensa: fazenda.suspensa },
    };
  }

  // Últimas entradas de suporte na fazenda, para o detalhe no painel (FR-002)
  async sessoesDaFazenda(fazendaId: string, agora = Date.now()) {
    const sessoes = await this.sessaoRepository.find({
      where: { fazendaId },
      relations: { administrador: true },
      order: { entradaEm: 'DESC' },
      take: 20,
    });
    return sessoes.map((s) => ({
      id: s.id,
      administrador: s.administrador?.nome ?? null,
      entradaEm: s.entradaEm,
      saidaEm: s.saidaEm,
      expirada: !s.saidaEm && agora - new Date(s.entradaEm).getTime() > DURACAO_SESSAO_SUPORTE_MS,
    }));
  }
}
