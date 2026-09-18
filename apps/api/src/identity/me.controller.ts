import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ErrorCodes, type CurrentUserResponse, type OrganizationSummary } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from './identity.store';

@Controller('v1')
export class MeController {
  constructor(private readonly identity: IdentityStore) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): CurrentUserResponse {
    return {
      uid: user.uid,
      email: user.email,
      organization: this.identity.getOrgForUid(user.uid),
    };
  }

  @Post('organizations')
  createOrg(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string },
  ): OrganizationSummary {
    const name = body?.name?.trim();
    if (!name) {
      throw new HttpException(
        { code: ErrorCodes.VALIDATION, message: 'İşletme adı gerekli.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.identity.createOrg(user.uid, name);
  }

  @Get('organizations/current')
  currentOrg(@CurrentUser() user: AuthUser): { organization: OrganizationSummary | null } {
    return { organization: this.identity.getOrgForUid(user.uid) };
  }
}
