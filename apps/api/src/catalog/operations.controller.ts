import { Controller, Get } from '@nestjs/common';
import type { OperationEvent } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/operations')
export class OperationsController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<{ items: OperationEvent[] }> {
    return this.identity.listOperations(user.uid);
  }
}
