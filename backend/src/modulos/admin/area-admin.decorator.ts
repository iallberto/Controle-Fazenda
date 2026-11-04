import {
  applyDecorators,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export const IS_AREA_ADMIN = 'areaAdmin';

@Injectable()
export class AdminJwtGuard extends AuthGuard('jwt-admin') {}

// Rotas do painel do administrador (FR-018). O guard global das fazendas pula
// estas rotas, e o AdminJwtGuard exige o token do administrador. Os dois vêm
// juntos no mesmo decorator para nunca ficar um sem o outro.
export const AreaAdmin = () =>
  applyDecorators(SetMetadata(IS_AREA_ADMIN, true), UseGuards(AdminJwtGuard));
