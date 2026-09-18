import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CURRENT_USER_KEY, type AuthUser } from './current-user.decorator';
import { FirebaseAuthService } from './firebase-auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebaseAuth: FirebaseAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const req = context.switchToHttp().getRequest<
      Request & { [CURRENT_USER_KEY]?: AuthUser }
    >();
    const user = await this.firebaseAuth.verifyBearer(req.header('authorization'));
    req[CURRENT_USER_KEY] = user;
    return true;
  }
}
