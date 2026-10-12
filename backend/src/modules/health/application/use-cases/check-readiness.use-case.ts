import type { DatabaseProbe } from '../../domain/services/database-probe.js';

export class CheckReadinessUseCase {
  constructor(private readonly database: DatabaseProbe) {}

  async execute(): Promise<{ status: 'ok' | 'unavailable' }> {
    return {
      status: (await this.database.isAvailable()) ? 'ok' : 'unavailable',
    };
  }
}
