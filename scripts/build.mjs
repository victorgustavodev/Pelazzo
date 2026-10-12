import { spawnSync } from 'node:child_process';
// Produção explícita mesmo quando executado na imagem de desenvolvimento.
const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'build', '--workspaces'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, NODE_ENV: 'production' },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
