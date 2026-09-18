import { Controller, Get } from '@nestjs/common';
import { BILLING_OFFERINGS, type BillingOffering } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@Controller('v1/billing')
export class BillingController {
  @Get('offering')
  offering(@CurrentUser() _user: AuthUser): {
    items: BillingOffering[];
    chargeable: false;
    processor: null;
    note: string;
  } {
    void _user;
    return {
      items: BILLING_OFFERINGS,
      chargeable: false,
      processor: null,
      note: 'Paketler yalnızca gösterilir. Kart, token ve tahsilat yok.',
    };
  }
}
