import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { firebaseErrorTr, getFirebaseAuth, googleProvider, isFirebaseConfigured } from '@/lib/firebase';
import { googleWebClientId } from '@/lib/firebaseConfig';

const orgKey = (uid: string) => `magazam.org.${uid}`;

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
};

type AuthContextValue = {
  ready: boolean;
  configured: boolean;
  user: SessionUser | null;
  orgName: string | null;
  idToken: string | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: (idToken?: string, accessToken?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setOrg: (name: string) => Promise<void>;
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
  const [orgName, setOrgName] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, async (next) => {
      if (!next) {
        setUser(null);
        setOrgName(null);
        setIdToken(null);
        setReady(true);
        return;
      }
      setUser(toSession(next));
      setIdToken(await next.getIdToken());
      const stored = await AsyncStorage.getItem(orgKey(next.uid));
      setOrgName(stored);
      setReady(true);
    });
  }, []);

  const requireAuth = () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase yapılandırılmadı');
    }
    return auth;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured,
      user,
      orgName,
      idToken,
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
            const cred = GoogleAuthProvider.credential(idTokenArg, accessToken);
            await signInWithCredential(auth, cred);
            return;
          }
          if (Platform.OS === 'web' && googleWebClientId()) {
            await signInWithPopup(auth, googleProvider());
            return;
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
      setOrg: async (name) => {
        if (!user) return;
        const trimmed = name.trim();
        await AsyncStorage.setItem(orgKey(user.uid), trimmed);
        setOrgName(trimmed);
      },
      signOut: async () => {
        const auth = getFirebaseAuth();
        if (auth) await firebaseSignOut(auth);
        setUser(null);
        setOrgName(null);
        setIdToken(null);
      },
    }),
    [ready, configured, user, orgName, idToken],
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
