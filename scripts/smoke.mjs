import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const port = 3101;
const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: new URL('../backend/', import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let startupError;
child.on('error', (error) => {
  startupError = error;
});
let output = '';
child.stdout.on('data', (chunk) => {
  output += chunk;
});
child.stderr.on('data', (chunk) => {
  output += chunk;
});

try {
  let live = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (startupError) throw startupError;
    if (child.exitCode !== null) throw new Error(`Backend encerrou: ${output}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        live = true;
        break;
      }
    } catch {
      /* Aguarda a inicialização. */
    }
    await setTimeout(250);
  }
  assert.ok(live, 'Backend deve iniciar');
  const ready = await fetch(`http://127.0.0.1:${port}/api/health/ready`, {
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(
    ready.status,
    200,
    'Prisma deve conseguir consultar o PostgreSQL',
  );
  assert.deepEqual(await ready.json(), { status: 'ok' });
  console.log('Smoke: backend compilado e conexão PostgreSQL disponíveis.');
} finally {
  child.kill();
}
