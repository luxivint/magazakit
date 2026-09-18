import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

import { readFirebaseConfig } from '@/lib/firebaseConfig';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function isFirebaseConfigured(): boolean {
  return true;
}

export function getFirebaseApp(): FirebaseApp | null {
  const config = readFirebaseConfig();
  if (!config) return null;
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const instance = getFirebaseApp();
  if (!instance) return null;
  if (!auth) auth = getAuth(instance);
  return auth;
}

export function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export async function getIdToken(): Promise<string | null> {
  const current = getFirebaseAuth()?.currentUser;
  if (!current) return null;
  return current.getIdToken();
}

export function firebaseErrorTr(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Geçerli bir e-posta gir.';
    case 'auth/missing-password':
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalı.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta ile hesap var. Giriş yap.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-posta veya şifre hatalı.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme. Biraz sonra tekrar dene.';
    case 'auth/network-request-failed':
      return 'Ağ hatası. Bağlantını kontrol et.';
    case 'auth/operation-not-allowed':
      return 'Bu giriş yöntemi Firebase Console’da kapalı.';
    case 'auth/unauthorized-domain':
      return 'Bu alan Firebase yetkili alanlarda yok.';
    default:
      return 'İşlem tamamlanamadı. Firebase yapılandırmasını kontrol et.';
  }
}
