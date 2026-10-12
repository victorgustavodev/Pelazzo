import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // generate/validate não precisam de um banco disponível.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
