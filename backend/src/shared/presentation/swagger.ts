import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  getSchemaPath,
  SwaggerModule,
  DocumentBuilder,
} from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export function ApiPage(model: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['items', 'total', 'page', 'limit'],
        properties: {
          items: { type: 'array', items: { $ref: getSchemaPath(model) } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          limit: { type: 'integer' },
        },
      },
    }),
  );
}
export function ApiErrors() {
  return applyDecorators(
    ApiBadRequestResponse({ description: 'Entrada inválida.' }),
    ApiUnauthorizedResponse({ description: 'Sessão ausente ou inválida.' }),
    ApiForbiddenResponse({ description: 'Sem acesso à pelada ou à operação.' }),
    ApiNotFoundResponse({ description: 'Registro não encontrado na pelada.' }),
    ApiConflictResponse({
      description:
        'Duplicação, histórico ou regra de negócio impede a operação.',
    }),
  );
}
export function setupSwagger(app: INestApplication) {
  if (!app.get(ConfigService).get<boolean>('SWAGGER_ENABLED')) return;
  const config = new DocumentBuilder()
    .setTitle('Pelazzo API')
    .setDescription(
      'Backend da pelada. Registre uma conta ou faça login, copie o token retornado e informe-o em Authorize. Valores monetários são inteiros em centavos; comprovantes são enviados manualmente pelo WhatsApp.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'opaque',
        description: 'Token de sessão retornado por cadastro/login.',
      },
      'session',
    )
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    () => SwaggerModule.createDocument(app, config),
    {
      jsonDocumentUrl: '/api/docs-json',
      customSiteTitle: 'Pelazzo — API',
      swaggerOptions: { persistAuthorization: false },
    },
  );
}
