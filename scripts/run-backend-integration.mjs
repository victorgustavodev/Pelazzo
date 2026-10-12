import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
config({
  path: fileURLToPath(new URL('../backend/.env', import.meta.url)),
  quiet: true,
});
if (!process.env.DATABASE_URL)
  throw new Error(
    'Configure DATABASE_URL para criar um banco de testes isolado.',
  );
const base = new URL(process.env.DATABASE_URL);
const name = `pelazzo_test_${randomBytes(8).toString('hex')}`;
if (!/^pelazzo_test_[0-9a-f]{16}$/.test(name))
  throw new Error('Nome de teste inválido.');
const database = new URL(base);
database.pathname = `/${name}`;
const admin = new Client({
  connectionString: base.toString(),
  connectionTimeoutMillis: 10000,
});
await admin.connect();
let created = false;
function run(args) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args,
    {
      cwd: new URL('../', import.meta.url),
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: database.toString(),
        TEST_DATABASE_URL: database.toString(),
        AUTH_SECRET: randomBytes(48).toString('hex'),
        AUTH_BASE_URL: 'http://localhost:3000',
        SWAGGER_ENABLED: 'true',
        THROTTLE_LIMIT: '1000',
      },
    },
  );
  if (result.error || result.status !== 0)
    throw new Error('Validação do backend falhou.');
}
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  run(['run', 'db:deploy']);
  run(['run', 'test:integration', '--workspace', '@pelazzo/backend']);
} finally {
  // Exclusivamente o banco recém-criado com nome aleatório, nunca o banco principal.
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
