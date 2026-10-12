import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../src/modules/health/presentation/controllers/health.controller.js';
import { CheckReadinessUseCase } from '../src/modules/health/application/use-cases/check-readiness.use-case.js';
import { validateEnvironment } from '../src/shared/config/environment.js';

for (const available of [true, false]) {
  test(`readiness retorna ${available ? '200' : '503'} conforme o banco`, async () => {
    const useCase = new CheckReadinessUseCase({
      isAvailable: async () => available,
    });
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: CheckReadinessUseCase, useValue: useCase }],
    }).compile();
    const controller = module.get(HealthController);
    try {
      assert.deepEqual(controller.live(), { status: 'ok' });
      if (available) {
        assert.deepEqual(await controller.ready(), { status: 'ok' });
      } else {
        await assert.rejects(
          controller.ready(),
          (error: unknown) =>
            error instanceof ServiceUnavailableException &&
            error.getStatus() === 503 &&
            JSON.stringify(error.getResponse()) ===
              JSON.stringify({ status: 'unavailable' }),
        );
      }
    } finally {
      await module.close();
    }
  });
}

test('configuração rejeita porta, origem e banco inválidos sem revelar credenciais', () => {
  const valid = { DATABASE_URL: 'postgresql://user:fake@localhost:5432/test' };
  assert.equal(validateEnvironment(valid).PORT, 3000);
  assert.throws(() => validateEnvironment({}), /DATABASE_URL/);
  assert.throws(() => validateEnvironment({ ...valid, PORT: -1 }), /PORT/);
  assert.throws(
    () => validateEnvironment({ DATABASE_URL: 'mysql://localhost/test' }),
    /PostgreSQL/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...valid,
        FRONTEND_ORIGIN: 'https://example.com/path',
      }),
    /FRONTEND_ORIGIN/,
  );
});
