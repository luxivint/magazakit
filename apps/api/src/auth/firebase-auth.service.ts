import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import type { AuthUser } from './current-user.decorator';
import {
  hasApplicationDefaultCredentials,
  resolveFirebaseProjectId,
} from '../config/firebase-env';

export const AUTH_NOT_CONFIGURED_MESSAGE =
  'FIREBASE_PROJECT_ID boş. API magazam-app üzerinde Firebase ID token doğrular; kayıt/şifre endpoint’i yok.';

export const UNAUTHENTICATED_MESSAGE =
  'Geçerli Firebase ID token gerekli (proje magazam-app). Header: Authorization: Bearer <token>.';

type AdminAuth = {
  verifyIdToken: (token: string) => Promise<{ uid: string; email?: string }>;
};

@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);
  private auth: AdminAuth | null = null;

  projectId(): string | null {
    return resolveFirebaseProjectId();
  }

  isConfigured(): boolean {
    return this.projectId() !== null;
  }

  usesAdc(): boolean {
    return hasApplicationDefaultCredentials();
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
    const projectId = this.projectId();
    if (!projectId) {
      throw this.notConfigured();
    }
    const appMod = await import('firebase-admin/app');
    const authMod = await import('firebase-admin/auth');
    if (appMod.getApps().length === 0) {
      if (hasApplicationDefaultCredentials()) {
        try {
          appMod.initializeApp({
            credential: appMod.applicationDefault(),
            projectId,
          });
        } catch {
          this.logger.warn(
            'GOOGLE_APPLICATION_CREDENTIALS set but ADC failed; verifying ID tokens with projectId only (no service account file is loaded from the repo).',
          );
          appMod.initializeApp({ projectId });
        }
      } else {
        appMod.initializeApp({ projectId });
      }
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
