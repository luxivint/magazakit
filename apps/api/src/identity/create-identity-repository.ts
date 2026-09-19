import { Logger } from '@nestjs/common';
import { resolve } from 'node:path';
import type { IdentityRepository } from './identity.repository';
import { persistMemoryRepository } from './file-identity.repository';
import { MemoryIdentityRepository } from './memory-identity.repository';
import { tryPostgresRepository } from './postgres-identity.repository';

export async function createIdentityRepository(): Promise<IdentityRepository> {
  const log = new Logger('IdentityRepository');
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    if (process.env.NODE_ENV === 'test') {
      log.warn('DATABASE_URL unset — in-memory store (test).');
      return new MemoryIdentityRepository();
    }
    const file =
      process.env.IDENTITY_FILE?.trim() ||
      resolve(process.cwd(), '.data/identity.json');
    log.log(`DATABASE_URL unset — file snapshot ${file}`);
    return persistMemoryRepository(new MemoryIdentityRepository(), file);
  }
  const pg = await tryPostgresRepository(databaseUrl);
  return pg ?? persistMemoryRepository(
    new MemoryIdentityRepository(),
    process.env.IDENTITY_FILE?.trim() || resolve(process.cwd(), '.data/identity.json'),
  );
}
