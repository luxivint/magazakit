import { Logger } from '@nestjs/common';
import type { IdentityRepository } from './identity.repository';
import { MemoryIdentityRepository } from './memory-identity.repository';
import { tryPostgresRepository } from './postgres-identity.repository';

export async function createIdentityRepository(): Promise<IdentityRepository> {
  const log = new Logger('IdentityRepository');
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    log.warn(
      'TODO(F2): persist organizations in Postgres. DATABASE_URL unset — using in-memory store keyed by Firebase uid.',
    );
    return new MemoryIdentityRepository();
  }
  const pg = await tryPostgresRepository(databaseUrl);
  return pg ?? new MemoryIdentityRepository();
}
