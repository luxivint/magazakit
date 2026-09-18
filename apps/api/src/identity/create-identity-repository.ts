import { Logger } from '@nestjs/common';
import type { IdentityRepository } from './identity.repository';
import { MemoryIdentityRepository } from './memory-identity.repository';
import { tryPostgresRepository } from './postgres-identity.repository';

export async function createIdentityRepository(): Promise<IdentityRepository> {
  const log = new Logger('IdentityRepository');
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    log.warn('DATABASE_URL unset — in-memory store (lost on restart). Set DATABASE_URL for Postgres.');
    return new MemoryIdentityRepository();
  }
  const pg = await tryPostgresRepository(databaseUrl);
  return pg ?? new MemoryIdentityRepository();
}
