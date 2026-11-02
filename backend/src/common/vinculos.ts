import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Raca } from '../raca/entities/raca.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Animal, StatusAnimal } from '../animal/entities/animal.entity';
import {
  CodigoIdentificacao,
  StatusCodigo,
} from '../codigo-identificacao/entities/codigo-identificacao.entity';

// Verificações compartilhadas entre módulos para garantir que um registro só
// referencie dados da própria fazenda.

export async function garantirRacaDisponivel(
  manager: EntityManager,
  fazendaId: string,
  racaId: string,
) {
  const raca = await manager.findOneBy(Raca, { id: racaId });
  // Raças com fazendaId null são as padrão do sistema, visíveis para todos
  if (!raca || (raca.fazendaId !== null && raca.fazendaId !== fazendaId)) {
    throw new NotFoundException('Raça não encontrada');
  }
}

export async function garantirUsuarioDaFazenda(
  manager: EntityManager,
  fazendaId: string,
  usuarioId: string,
  papel = 'informado',
) {
  const usuario = await manager.findOneBy(Usuario, { id: usuarioId });
  if (!usuario || usuario.fazendaId !== fazendaId) {
    throw new NotFoundException(`Usuário ${papel} não encontrado`);
  }
}

export function garantirAnimalAtivo(animal: Animal) {
  if (animal.status !== StatusAnimal.ATIVO) {
    throw new BadRequestException(
      `O animal #${animal.brinco} não está ativo (status: ${animal.status})`,
    );
  }
}

// Marca o código como vinculado só se ele ainda estiver disponível. O UPDATE
// condicional evita que duas requisições simultâneas usem o mesmo código.
export async function reservarCodigo(
  manager: EntityManager,
  codigoId: string,
  animalId: string,
) {
  const resultado = await manager.update(
    CodigoIdentificacao,
    { id: codigoId, status: StatusCodigo.DISPONIVEL },
    { status: StatusCodigo.VINCULADO, animalId, vinculadoEm: new Date() },
  );
  if (!resultado.affected) {
    throw new ConflictException('Este código já está vinculado ou foi desativado');
  }
}

// Serializa a geração de números de brinco por fazenda dentro da transação,
// para que gerações simultâneas não calculem o mesmo próximo número.
export async function travarNumeracaoDaFazenda(manager: EntityManager, fazendaId: string) {
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [fazendaId]);
}
