import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type SqlQuery = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

export function migrationsDir(): string {
  return join(__dirname, '..', '..', 'migrations');
}

export async function listMigrationFilenames(dir = migrationsDir()): Promise<string[]> {
  const names = await readdir(dir);
  return names.filter((name) => /^\d+_.*\.sql$/u.test(name)).sort();
}

/** Applies numbered SQL files once. Does not log DATABASE_URL. */
export async function applySqlMigrations(pool: SqlQuery, dir = migrationsDir()): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const applied: string[] = [];
  for (const filename of await listMigrationFilenames(dir)) {
    const existing = await pool.query('SELECT filename FROM schema_migrations WHERE filename = $1', [
      filename,
    ]);
    if (existing.rows[0]) {
      continue;
    }
    const sql = await readFile(join(dir, filename), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    applied.push(filename);
  }
  return applied;
}
