import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/auth.service';
import { Modulo } from '../acesso/modulo.decorator';
import { ModuloPago } from '../acesso/modulo-pago';
import { ProdutosService } from './produtos.service';
import {
  CriarProdutoDto,
  EditarProdutoDto,
  FiltroProdutosDto,
} from './dto/leite.dto';

// Produtos com carência (spec 004, US2); dono e funcionário cadastram
@ApiTags('leite')
@ApiBearerAuth()
@Modulo(ModuloPago.LEITE)
@Controller('modulos/leite/produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query() filtro: FiltroProdutosDto) {
    return this.produtosService.listar(
      user.fazendaId,
      filtro.incluirInativos === 'true',
    );
  }

  @Post()
  criar(@CurrentUser() user: JwtPayload, @Body() dto: CriarProdutoDto) {
    return this.produtosService.criar(user.fazendaId, user.sub, dto);
  }

  @Patch(':id')
  editar(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EditarProdutoDto,
  ) {
    return this.produtosService.editar(user.fazendaId, user.sub, id, dto);
  }
}
