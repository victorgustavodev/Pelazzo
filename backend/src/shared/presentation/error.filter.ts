import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { BusinessError } from '../domain/errors.js';
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiErrors');
  catch(error: unknown, host: ArgumentsHost) {
    const response = host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: unknown): void } }>();
    if (error instanceof BusinessError) {
      const status = {
        INVALID: 400,
        UNAUTHENTICATED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
      }[error.kind];
      response
        .status(status)
        .json({ code: error.kind, message: error.message });
      return;
    }
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    // Não registrar query, corpo da requisição, senha, token ou erro do provedor.
    this.logger.error('Falha interna na operação da API.');
    response.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível concluir a operação.',
    });
  }
}
