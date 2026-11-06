import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hojeLocal } from '../common/datas';
import { ItemPlano, PrecoPlano } from '../modulos/admin/entities/preco-plano.entity';
import { TipoRegistroAcesso, RegistroAcesso } from '../modulos/admin/entities/registro-acesso.entity';
import { acessoDaFazenda, type AcessoCalculado } from './acesso-fazenda';
import { Fazenda } from './entities/fazenda.entity';

// WhatsApp do suporte da empresa (spec 008, FR-014); a configuração do servidor
// pode trocar. Só números, com o código do país.
export const WHATSAPP_SUPORTE_PADRAO = '5535984776552';

// Mesmo prazo de cache dos módulos: mudar o prazo vale na hora nesta instância
// (limparCache) e em no máximo 1 minuto nas outras.
const VALIDADE_CACHE_MS = 60_000;
const cache = new Map<string, { expiraEm: number; fazenda: Pick<Fazenda, 'semPrazo' | 'acessoAte'> }>();

// Prazo de acesso da fazenda (spec 008, US3): situação na data, valor do plano
// e os dados que o dono vê para renovar.
@Injectable()
export class AcessoFazendaService {
  constructor(
    @InjectRepository(Fazenda)
    private readonly fazendaRepository: Repository<Fazenda>,
    @InjectRepository(PrecoPlano)
    private readonly precoRepository: Repository<PrecoPlano>,
    @InjectRepository(RegistroAcesso)
    private readonly registroRepository: Repository<RegistroAcesso>,
    private readonly config: ConfigService,
  ) {}

  static limparCache(fazendaId: string) {
    cache.delete(fazendaId);
  }

  async situacao(fazendaId: string, hoje = hojeLocal()): Promise<AcessoCalculado> {
    const guardado = cache.get(fazendaId);
    let fazenda = guardado && guardado.expiraEm > Date.now() ? guardado.fazenda : null;
    if (!fazenda) {
      const registro = await this.fazendaRepository.findOne({
        where: { id: fazendaId },
        select: { id: true, semPrazo: true, acessoAte: true },
      });
      if (!registro) throw new NotFoundException('Fazenda não encontrada');
      fazenda = { semPrazo: registro.semPrazo, acessoAte: registro.acessoAte };
      cache.set(fazendaId, { expiraEm: Date.now() + VALIDADE_CACHE_MS, fazenda });
    }
    return acessoDaFazenda(fazenda, hoje);
  }

  // Valor da renovação: pacote inicial + módulos do plano (R5)
  async valorDoPlano(modulosPlano: string[]): Promise<number> {
    const precos = await this.precoRepository.find();
    const preco = (item: string) => precos.find((p) => p.item === item)?.valorCentavos ?? 0;
    return preco(ItemPlano.PACOTE_INICIAL) + modulosPlano.reduce((total, m) => total + preco(m), 0);
  }

  whatsappSuporte() {
    return (this.config.get<string>('SUPORTE_WHATSAPP') || WHATSAPP_SUPORTE_PADRAO).replace(/\D/g, '');
  }

  // GET /fazenda/acesso: situação para todos; valor, chave Pix e módulos só para o dono
  async paraUsuario(fazendaId: string, ehDono: boolean, hoje = hojeLocal()) {
    const fazenda = await this.fazendaRepository.findOneBy({ id: fazendaId });
    if (!fazenda) throw new NotFoundException('Fazenda não encontrada');
    const acesso = acessoDaFazenda(fazenda, hoje);
    const ultimo = await this.registroRepository.findOne({
      where: { fazendaId },
      order: { criadoEm: 'DESC' },
    });
    const base = {
      ...acesso,
      fazendaNome: fazenda.nome,
      emTeste: ultimo?.tipo === TipoRegistroAcesso.TESTE,
      whatsappSuporte: this.whatsappSuporte(),
    };
    if (!ehDono) return base;
    return {
      ...base,
      modulosPlano: fazenda.modulosPlano,
      valorCentavos: await this.valorDoPlano(fazenda.modulosPlano),
      pixChave: this.config.get<string>('PIX_CHAVE') || null,
    };
  }
}
