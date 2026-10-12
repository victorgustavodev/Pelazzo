import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { CheckReadinessUseCase } from '../../application/use-cases/check-readiness.use-case.js';
import { Public } from '../../../auth/presentation/auth.decorators.js';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';

@Public()
@ApiTags('Saúde')
@Controller('health')
export class HealthController {
  constructor(private readonly readiness: CheckReadinessUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Verificar processo ativo' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['ok'] } },
    },
  })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Verificar conexão PostgreSQL' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['ok'] } },
    },
  })
  @ApiServiceUnavailableResponse({ description: 'Banco indisponível.' })
  async ready() {
    const result = await this.readiness.execute();
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
    return result;
  }
}
