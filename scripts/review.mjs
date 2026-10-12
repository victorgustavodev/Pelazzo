// Preview descartável: não insere dados no banco principal.
import { Client } from 'pg';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { config } from 'dotenv';
config({ path: new URL('../backend/.env', import.meta.url), quiet: true });
const name = `pelazzo_test_${randomBytes(8).toString('hex')}`;
const source = new URL(process.env.DATABASE_URL);
const database = new URL(source);
database.pathname = `/${name}`;
const admin = new Client({
  connectionString: source.toString(),
  connectionTimeoutMillis: 10000,
});
await admin.connect();
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: database.toString(),
  AUTH_SECRET: randomBytes(48).toString('hex'),
  AUTH_BASE_URL: 'http://localhost:3001',
  FRONTEND_ORIGIN: 'http://localhost:5174',
  PORT: '3001',
  SWAGGER_ENABLED: 'true',
  THROTTLE_LIMIT: '1000',
  API_PROXY_TARGET: 'http://127.0.0.1:3001',
  VITE_API_BASE_URL: '/api',
  DEV_POLLING: 'true',
};
const processes = [];
let created = false;
function command(args) {
  const result = spawnSync('npm', args, { env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error('Falha ao preparar preview.');
}
function launch(command, args) {
  const child = spawn(command, args, { env, stdio: 'ignore' });
  child.on('error', () => process.emit('SIGTERM'));
  processes.push(child);
  return child;
}
async function ready(url) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return;
    } catch {
      /* readiness ainda não disponível */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Preview não iniciou.');
}
async function call(path, body, token) {
  const r = await fetch(`http://127.0.0.1:3001/api${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Falha no setup ${path}: HTTP ${r.status}`);
  return r.json();
}
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  command(['run', 'db:deploy']);
  command(['run', 'build', '--workspace', '@pelazzo/backend']);
  launch('node', ['backend/dist/main.js']);
  await ready('http://127.0.0.1:3001/api/health/ready');
  const owner = await call('/auth/register', {
    email: 'preview@example.invalid',
    displayName: 'Admin de teste',
    password: 'Preview-Only-123!',
  });
  const group = await call(
    '/groups',
    { name: 'Pelada de demonstração', primaryColor: '#15803d' },
    owner.token,
  );
  const route = `/groups/${group.id}`;
  const match = await call(
    `${route}/matches`,
    {
      title: 'Pelada de quinta',
      startsAt: new Date(Date.now() + 86400000 * 3).toISOString(),
      location: 'Quadra de exemplo',
    },
    owner.token,
  );
  for (const [index, name] of [
    'Admin de teste',
    'João',
    'Pedro',
    'Lucas',
    'José',
    'Rafael',
    'Bruno',
    'Caio',
    'Diego',
    'André',
  ].entries()) {
    const player = await call(
      `${route}/participants`,
      {
        name,
        modality: index % 2 ? 'DAILY' : 'MONTHLY',
        ...(index === 0 ? { userId: owner.user.id } : {}),
      },
      owner.token,
    );
    const presence = await call(
      `${route}/matches/${match.id}/participants`,
      {
        participantId: player.id,
        ...(index < 2 ? { expectedAmountCents: 4000 } : {}),
      },
      owner.token,
    );
    if (index < 2)
      await call(
        `${route}/payments`,
        {
          participantId: player.id,
          matchParticipantId: presence.id,
          amountCents: index ? 2500 : 4000,
          method: 'PIX',
          idempotencyKey: `preview-payment-${index}`,
        },
        owner.token,
      );
  }
  await call(
    `${route}/expenses`,
    {
      matchId: match.id,
      description: 'Quadra (exemplo)',
      amountCents: 5000,
      idempotencyKey: 'preview-expense',
    },
    owner.token,
  );
  launch('node', [
    'node_modules/vite/bin/vite.js',
    'frontend',
    '--host',
    '0.0.0.0',
    '--port',
    '5174',
  ]);
  await ready('http://127.0.0.1:5174');
  console.log(
    'Preview isolado: http://localhost:5174 · conta fictícia preview@example.invalid. Banco principal preservado.',
  );
  await Promise.race([once(process, 'SIGINT'), once(process, 'SIGTERM')]);
} finally {
  for (const child of processes) child.kill('SIGTERM');
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
