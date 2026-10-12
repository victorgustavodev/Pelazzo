import { randomUUID, randomBytes, createHash, randomInt } from 'node:crypto';
import type { Runtime } from '../domain/types.js';
export class SystemRuntime implements Runtime {
  id() {
    return randomUUID();
  }
  now() {
    return new Date();
  }
  token() {
    return randomBytes(32).toString('hex');
  }
  hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
  randomInt(maxExclusive: number) {
    return randomInt(maxExclusive);
  }
}
