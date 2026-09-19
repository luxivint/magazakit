import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Logger } from '@nestjs/common';
import type { IdentityRepository } from './identity.repository';
import { MemoryIdentityRepository } from './memory-identity.repository';

const READ = /^(get|list|find|count)/;

export function persistMemoryRepository(
  repo: MemoryIdentityRepository,
  filePath: string,
): IdentityRepository {
  const log = new Logger('IdentityFile');
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    repo.importSnapshot(raw);
    log.log(`identity snapshot loaded (${filePath})`);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      log.warn(`identity snapshot unreadable; starting empty (${code ?? 'parse'})`);
    }
  }

  const write = () => {
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(repo.exportSnapshot()), { mode: 0o600 });
    } catch (err) {
      log.warn(`identity snapshot write failed: ${(err as Error).message}`);
    }
  };

  return new Proxy(repo, {
    get(target, prop, receiver) {
      if (prop === 'backend') return 'file';
      const value = Reflect.get(target, prop, receiver) as unknown;
      if (typeof value !== 'function') return value;
      const fn = value as (...args: unknown[]) => unknown;
      return async (...args: unknown[]) => {
        const result = await fn.apply(target, args);
        if (!READ.test(String(prop))) write();
        return result;
      };
    },
  }) as IdentityRepository;
}
