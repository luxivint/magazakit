export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

/** Public web SDK config for magazam-app. Override with EXPO_PUBLIC_FIREBASE_*. */
export const MAGAZAM_FIREBASE: FirebasePublicConfig = {
  apiKey: 'AIzaSyCmu6sO_LFzDsX_GKzS9f3kXIWF8SPTyik',
  authDomain: 'magazam-app.firebaseapp.com',
  projectId: 'magazam-app',
  storageBucket: 'magazam-app.firebasestorage.app',
  messagingSenderId: '978990997665',
  appId: '1:978990997665:web:92f019641aeb0d08ded0e0',
};

export function readFirebaseConfig(): FirebasePublicConfig {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (apiKey && authDomain && projectId && storageBucket && messagingSenderId && appId) {
    if (!apiKey.includes('YOUR_') && apiKey !== 'changeme') {
      return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
    }
  }
  return MAGAZAM_FIREBASE;
}

export function googleWebClientId(): string | null {
  const id = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!id || id.includes('YOUR_')) return null;
  return id;
}
