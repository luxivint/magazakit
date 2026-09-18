/** Live Firebase project (see docs/firebase.md). Never commit a service-account JSON. */
export const DEFAULT_FIREBASE_PROJECT_ID = 'magazam-app';

export function resolveFirebaseProjectId(): string | null {
  if (process.env.FIREBASE_PROJECT_ID !== undefined) {
    const trimmed = process.env.FIREBASE_PROJECT_ID.trim();
    return trimmed === '' ? null : trimmed;
  }
  return DEFAULT_FIREBASE_PROJECT_ID;
}

export function hasApplicationDefaultCredentials(): boolean {
  return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
}
