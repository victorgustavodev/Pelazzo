import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { CheckReadinessUseCase } from '../../application/use-cases/check-readiness.use-case.js';

@Controller('health')
export class HealthController {
  constructor(private readonly readiness: CheckReadinessUseCase) {}

  @Get()
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const result = await this.readiness.execute();
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
    return result;
  }
}
