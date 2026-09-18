import { listMigrationFilenames, migrationsDir } from './run-migrations';

describe('SQL migrations', () => {
  it('ships numbered files in apps/api/migrations', async () => {
    const files = await listMigrationFilenames(migrationsDir());
    expect(files[0]).toBe('001_f3_core.sql');
    expect(files).toContain('002_f4_stubs.sql');
    expect(files).toContain('003_f6_stubs.sql');
    expect(files.every((name) => /^\d+_.*\.sql$/u.test(name))).toBe(true);
  });
});
