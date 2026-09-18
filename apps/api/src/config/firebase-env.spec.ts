import {
  DEFAULT_FIREBASE_PROJECT_ID,
  resolveFirebaseProjectId,
} from './firebase-env';

describe('resolveFirebaseProjectId', () => {
  const previous = process.env.FIREBASE_PROJECT_ID;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.FIREBASE_PROJECT_ID;
    } else {
      process.env.FIREBASE_PROJECT_ID = previous;
    }
  });

  it('defaults to magazam-app', () => {
    delete process.env.FIREBASE_PROJECT_ID;
    expect(resolveFirebaseProjectId()).toBe(DEFAULT_FIREBASE_PROJECT_ID);
  });

  it('treats blank env as disabled', () => {
    process.env.FIREBASE_PROJECT_ID = '  ';
    expect(resolveFirebaseProjectId()).toBeNull();
  });
});
