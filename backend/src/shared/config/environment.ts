export function validateEnvironment(input: Record<string, unknown>) {
  const port = Number(input.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser uma porta válida.');
  }
  const databaseUrl = input.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || !databaseUrl) {
    throw new Error('DATABASE_URL é obrigatória.');
  }
  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL inválida.');
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    throw new Error('DATABASE_URL deve usar PostgreSQL.');
  }
  const origin = String(input.FRONTEND_ORIGIN ?? 'http://localhost:5173');
  let frontend: URL;
  try {
    frontend = new URL(origin);
  } catch {
    throw new Error('FRONTEND_ORIGIN inválida.');
  }
  if (
    !['http:', 'https:'].includes(frontend.protocol) ||
    frontend.origin !== origin
  ) {
    throw new Error('FRONTEND_ORIGIN deve ser uma origem HTTP válida.');
  }
  const secret = input.AUTH_SECRET;
  if (typeof secret !== 'string' || secret.length < 32)
    throw new Error(
      'AUTH_SECRET deve conter pelo menos 32 caracteres aleatórios.',
    );
  const authBaseUrl = String(input.AUTH_BASE_URL ?? 'http://localhost:3000');
  try {
    const url = new URL(authBaseUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== authBaseUrl
    )
      throw new Error();
  } catch {
    throw new Error('AUTH_BASE_URL deve ser uma origem HTTP válida.');
  }
  const throttleLimit = Number(input.THROTTLE_LIMIT ?? 120);
  if (
    !Number.isInteger(throttleLimit) ||
    throttleLimit < 1 ||
    throttleLimit > 10000
  )
    throw new Error('THROTTLE_LIMIT inválido.');
  const swagger = input.SWAGGER_ENABLED ?? input.NODE_ENV !== 'production';
  if (![true, false, 'true', 'false'].includes(swagger as boolean | string))
    throw new Error('SWAGGER_ENABLED inválido.');
  return {
    ...input,
    PORT: port,
    DATABASE_URL: databaseUrl,
    FRONTEND_ORIGIN: origin,
    AUTH_SECRET: secret,
    AUTH_BASE_URL: authBaseUrl,
    SWAGGER_ENABLED: swagger === true || swagger === 'true',
    THROTTLE_LIMIT: throttleLimit,
  };
}
