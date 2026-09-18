export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export function readFirebaseConfig(): FirebasePublicConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }
  if (apiKey.includes('YOUR_') || apiKey === 'changeme') return null;
  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

export function googleWebClientId(): string | null {
  const id = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!id || id.includes('YOUR_')) return null;
  return id;
}
