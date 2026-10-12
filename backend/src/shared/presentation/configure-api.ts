import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './swagger.js';
export function configureApi(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: app.get(ConfigService).getOrThrow<string>('FRONTEND_ORIGIN'),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  setupSwagger(app);
}
