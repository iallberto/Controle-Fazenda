import { SetMetadata } from '@nestjs/common';
import { PapelUsuario } from '../../usuario/entities/usuario.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...papeis: PapelUsuario[]) => SetMetadata(ROLES_KEY, papeis);