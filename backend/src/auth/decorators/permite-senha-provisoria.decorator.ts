import { SetMetadata } from '@nestjs/common';

// Rota aceita mesmo com a senha provisória ainda não trocada (spec 007, FR-004)
export const PERMITE_SENHA_PROVISORIA = 'permiteSenhaProvisoria';
export const PermiteSenhaProvisoria = () => SetMetadata(PERMITE_SENHA_PROVISORIA, true);
