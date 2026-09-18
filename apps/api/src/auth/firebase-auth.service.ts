import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import type { AuthUser } from './current-user.decorator';

export const AUTH_NOT_CONFIGURED_MESSAGE =
  'FIREBASE_PROJECT_ID yok. API Firebase ID token doğrular; kayıt/şifre endpoint’i yok. Expo Authorization: Bearer <ID token> göndermelidir.';

export const UNAUTHENTICATED_MESSAGE =
  'Geçerli Firebase ID token gerekli. Header: Authorization: Bearer <token>.';

type AdminAuth = {
  verifyIdToken: (token: string) => Promise<{ uid: string; email?: string }>;
};

@Injectable()
export class FirebaseAuthService {
  private auth: AdminAuth | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.FIREBASE_PROJECT_ID?.trim());
  }

  async verifyBearer(authorization: string | undefined): Promise<AuthUser> {
    if (!this.isConfigured()) {
      throw this.notConfigured();
    }
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw this.unauthenticated();
    }
    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw this.unauthenticated();
    }
    try {
      const decoded = await this.adminAuth().then((auth) => auth.verifyIdToken(token));
      return { uid: decoded.uid, email: decoded.email ?? null };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw this.unauthenticated();
    }
  }

  private async adminAuth(): Promise<AdminAuth> {
    if (this.auth) {
      return this.auth;
    }
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
      throw this.notConfigured();
    }
    const appMod = await import('firebase-admin/app');
    const authMod = await import('firebase-admin/auth');
    if (appMod.getApps().length === 0) {
      appMod.initializeApp({ projectId });
    }
    this.auth = authMod.getAuth();
    return this.auth;
  }

  notConfigured(): HttpException {
    return new HttpException(
      { code: ErrorCodes.AUTH_NOT_CONFIGURED, message: AUTH_NOT_CONFIGURED_MESSAGE },
      HttpStatus.UNAUTHORIZED,
    );
  }

  unauthenticated(): HttpException {
    return new HttpException(
      { code: ErrorCodes.UNAUTHENTICATED, message: UNAUTHENTICATED_MESSAGE },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
