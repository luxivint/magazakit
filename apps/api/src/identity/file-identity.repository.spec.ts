import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { persistMemoryRepository } from './file-identity.repository';
import { MemoryIdentityRepository } from './memory-identity.repository';

describe('persistMemoryRepository', () => {
  it('reloads the organization after a new process snapshot', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'magazakit-id-'));
    const file = join(dir, 'identity.json');
    const first = persistMemoryRepository(new MemoryIdentityRepository(), file);
    const org = await first.createOrg('uid-atakan', 'Luxivint');
    expect(JSON.parse(readFileSync(file, 'utf8')).seq).toBe(1);

    const second = persistMemoryRepository(new MemoryIdentityRepository(), file);
    expect(second.backend).toBe('file');
    await expect(second.getOrgForUid('uid-atakan')).resolves.toEqual(org);
  });
});
