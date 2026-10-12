export function validateEnvironment(input: Record<string, unknown>) {
  const port = Number(input.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT deve ser uma porta válida.');
  }
  const databaseUrl = input.DATABASE_URL;
  if (typeof databaseUrl !== 'string' || !databaseUrl) {
    throw new Error('DATABASE_URL é obrigatória.');
  }
  const database = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    throw new Error('DATABASE_URL deve usar PostgreSQL.');
  }
  const origin = String(input.FRONTEND_ORIGIN ?? 'http://localhost:5173');
  const frontend = new URL(origin);
  if (
    !['http:', 'https:'].includes(frontend.protocol) ||
    frontend.origin !== origin
  ) {
    throw new Error('FRONTEND_ORIGIN deve ser uma origem HTTP válida.');
  }
  return {
    ...input,
    PORT: port,
    DATABASE_URL: databaseUrl,
    FRONTEND_ORIGIN: origin,
  };
}
