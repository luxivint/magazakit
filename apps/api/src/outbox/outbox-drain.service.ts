import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IdentityStore } from '../identity/identity.store';

@Injectable()
export class OutboxDrainService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(OutboxDrainService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly identity: IdentityStore) {}

  onModuleInit(): void {
    const ms = Number(process.env.OUTBOX_DRAIN_INTERVAL_MS ?? 4000);
    if (!Number.isFinite(ms) || ms <= 0) {
      this.log.log('outbox drain interval disabled (OUTBOX_DRAIN_INTERVAL_MS<=0)');
      return;
    }
    this.timer = setInterval(() => {
      void this.identity.drainOutbox().catch(() => undefined);
    }, ms);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
