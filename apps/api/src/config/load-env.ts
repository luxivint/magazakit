import { resolve } from 'node:path';
import { config } from 'dotenv';

/** Load repo-root then apps/api .env. Never required; secrets stay out of git. */
export function loadEnvFiles(): void {
  const cwd = process.cwd();
  config({ path: resolve(cwd, '../../.env') });
  config({ path: resolve(cwd, '.env') });
}
