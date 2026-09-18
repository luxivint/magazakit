import { Body, Controller, Get, Post } from '@nestjs/common';
import type { OrgInvite, OrgMember } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/team')
export class TeamController {
  constructor(private readonly identity: IdentityStore) {}

  @Get('members')
  members(@CurrentUser() user: AuthUser): Promise<{ members: OrgMember[]; invites: OrgInvite[] }> {
    return this.identity.listTeam(user.uid);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<{ members: OrgMember[]; invites: OrgInvite[] }> {
    return this.identity.listTeam(user.uid);
  }

  @Post('invites')
  invite(
    @CurrentUser() user: AuthUser,
    @Body() body: { email?: string },
  ): Promise<OrgInvite> {
    return this.identity.inviteMember(user.uid, body?.email ?? '');
  }
}
