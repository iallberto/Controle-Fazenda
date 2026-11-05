import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { PermiteSenhaProvisoria } from './decorators/permite-senha-provisoria.decorator';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import type { JwtPayload } from './auth.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Troca da própria senha; aceita a senha provisória (spec 007, FR-001)
  @PermiteSenhaProvisoria()
  @Post('trocar-senha')
  @HttpCode(HttpStatus.OK)
  trocarSenha(@CurrentUser() usuario: JwtPayload, @Body() dto: TrocarSenhaDto) {
    return this.authService.trocarSenha(usuario.sub, dto);
  }
}