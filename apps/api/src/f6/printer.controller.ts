import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import type { PrinterSettings, PrinterTestResult } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/printer')
export class PrinterController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<PrinterSettings> {
    return this.identity.getPrinter(user.uid);
  }

  @Put()
  save(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; host?: string | null },
  ): Promise<PrinterSettings> {
    return this.identity.savePrinter(user.uid, body ?? {});
  }

  @Post('test-print')
  testPrint(@CurrentUser() user: AuthUser): Promise<PrinterTestResult> {
    return this.identity.testPrint(user.uid);
  }
}
