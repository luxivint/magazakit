import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { ApiError, createOrganization, fetchCurrentOrganization, fetchMe } from '@/lib/apiClient';
import { firebaseErrorTr, getFirebaseAuth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { googleWebClientId } from '@/lib/firebaseConfig';
import type { OrganizationSummary } from '@/lib/api';

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  ready: boolean;
  configured: boolean;
  user: SessionUser | null;
  org: OrganizationSummary | null;
  orgName: string | null;
  idToken: string | null;
  apiError: string | null;
  refreshMe: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: (idToken?: string, accessToken?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  createOrg: (name: string) => Promise<OrganizationSummary>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toSession(user: User): SessionUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    name: user.displayName || user.email?.split('@')[0] || 'Hesap',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isFirebaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [org, setOrg] = useState<OrganizationSummary | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadIdentity = async (firebaseUser: User) => {
    setUser(toSession(firebaseUser));
    setIdToken(await firebaseUser.getIdToken());
    try {
      const [me, current] = await Promise.all([fetchMe(), fetchCurrentOrganization()]);
      setOrg(current ?? me.organization);
      setApiError(null);
    } catch (e) {
      setOrg(null);
      setApiError(e instanceof ApiError ? e.message : 'Sunucu yanıt vermedi.');
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, async (next) => {
      if (!next) {
        setUser(null);
        setOrg(null);
        setIdToken(null);
        setApiError(null);
        setReady(true);
        return;
      }
      await loadIdentity(next);
      setReady(true);
    });
  }, []);

  const requireAuth = () => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error('Firebase yapılandırılmadı');
    return auth;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured,
      user,
      org,
      orgName: org?.name ?? null,
      idToken,
      apiError,
      refreshMe: async () => {
        const current = getFirebaseAuth()?.currentUser;
        if (current) await loadIdentity(current);
      },
      signInEmail: async (email, password) => {
        try {
          await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
        } catch (e) {
          throw new Error(firebaseErrorTr((e as { code?: string }).code ?? ''));
        }
      },
      signUpEmail: async (name, email, password) => {
        try {
          const cred = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch (e) {
          throw new Error(firebaseErrorTr((e as { code?: string }).code ?? ''));
        }
      },
      signInGoogle: async (idTokenArg, accessToken) => {
        const auth = requireAuth();
        try {
          if (idTokenArg) {
            await signInWithCredential(auth, GoogleAuthProvider.credential(idTokenArg, accessToken));
            return;
          }
          if (Platform.OS === 'web') {
            await signInWithPopup(auth, googleProvider());
            return;
          }
          if (!googleWebClientId()) {
            throw new Error('Google girişi için EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID gerekir.');
          }
          throw new Error('Google girişi için EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID gerekir.');
        } catch (e) {
          const code = (e as { code?: string }).code;
          throw new Error(code ? firebaseErrorTr(code) : (e as Error).message);
        }
      },
      resetPassword: async (email) => {
        try {
          await sendPasswordResetEmail(requireAuth(), email.trim());
        } catch (e) {
          throw new Error(firebaseErrorTr((e as { code?: string }).code ?? ''));
        }
      },
      createOrg: async (name) => {
        try {
          const created = await createOrganization(name.trim());
          const current = await fetchCurrentOrganization();
          const next = current ?? created;
          if (!next) {
            throw new ApiError('İşletme oluşturulamadı. Tekrar dene.', 500);
          }
          setOrg(next);
          setApiError(null);
          return next;
        } catch (e) {
          setOrg(null);
          const message = e instanceof ApiError ? e.message : 'İşletme oluşturulamadı.';
          setApiError(message);
          throw e instanceof Error ? e : new Error(message);
        }
      },
      signOut: async () => {
        const auth = getFirebaseAuth();
        if (auth) await firebaseSignOut(auth);
        setUser(null);
        setOrg(null);
        setIdToken(null);
        setApiError(null);
      },
    }),
    [ready, configured, user, org, idToken, apiError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider dışında');
  return ctx;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AY';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
