import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const CANDIDATES = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/api/.env'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env'),
];

/** Load gitignored .env files. Never required; secrets stay out of git. Later files do not override. */
export function loadEnvFiles(): void {
  const seen = new Set<string>();
  for (const path of CANDIDATES) {
    if (seen.has(path) || !existsSync(path)) {
      continue;
    }
    seen.add(path);
    config({ path });
  }
}
