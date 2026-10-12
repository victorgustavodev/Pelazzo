import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configureApi } from './shared/presentation/configure-api.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  configureApi(app);
  app.enableShutdownHooks();
  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap().catch(() => {
  console.error(
    'Não foi possível iniciar o backend. Verifique a configuração.',
  );
  process.exitCode = 1;
});
