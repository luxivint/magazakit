import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ErrorCodes, type DeviceRegistration } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from './identity.store';

@Controller('v1/devices')
export class DevicesController {
  constructor(private readonly identity: IdentityStore) {}

  @Post()
  async register(
    @CurrentUser() user: AuthUser,
    @Body() body: { fcmToken?: string },
  ): Promise<DeviceRegistration> {
    const fcmToken = body?.fcmToken?.trim();
    if (!fcmToken) {
      throw new HttpException(
        { code: ErrorCodes.VALIDATION, message: 'fcmToken gerekli.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.identity.saveDevice(user.uid, fcmToken);
    return { uid: user.uid, stored: true, durable: this.identity.backend === 'postgres' };
  }
}
