import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators/public.decorator';

// Verificação de saúde (spec 007, FR-014): o Docker e o monitoramento externo
// chamam esta rota. Responde ok só se o banco também responde.
@ApiTags('saude')
@Controller('saude')
export class SaudeController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async verificar() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'erro' });
    }
  }
}
