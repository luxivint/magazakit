import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuthUser = {
  uid: string;
  email: string | null;
};

export const CURRENT_USER_KEY = 'authUser';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request & { [CURRENT_USER_KEY]?: AuthUser }>();
    const user = req[CURRENT_USER_KEY];
    if (!user) {
      throw new Error('CurrentUser used on a public route');
    }
    return user;
  },
);
