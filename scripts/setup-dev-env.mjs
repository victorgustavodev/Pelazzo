import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const rootFile = fileURLToPath(new URL('../.env', import.meta.url));
const current = existsSync(rootFile) ? readFileSync(rootFile, 'utf8') : '';
const existing = /^AUTH_SECRET=([^\r\n]+)\r?$/m.exec(current)?.[1]?.trim();
const secret = existing || randomBytes(48).toString('hex');
if (!existing)
  writeFileSync(
    rootFile,
    `${current.trimEnd()}\nAUTH_SECRET=${secret}\n`.trimStart(),
  );
const backendFile = fileURLToPath(new URL('../backend/.env', import.meta.url));
const backend = existsSync(backendFile)
  ? readFileSync(backendFile, 'utf8')
  : readFileSync(new URL('../backend/.env.example', import.meta.url), 'utf8');
if (!/^AUTH_SECRET=[^\r\n]+\r?$/m.test(backend))
  writeFileSync(
    backendFile,
    /^AUTH_SECRET=\r?$/m.test(backend)
      ? backend.replace(/^AUTH_SECRET=\r?$/m, `AUTH_SECRET=${secret}`)
      : `${backend.trimEnd()}\nAUTH_SECRET=${secret}\n`,
  );
console.log(
  'Configuração local de autenticação preparada. Segredos não foram exibidos.',
);
