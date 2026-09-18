import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { CHANNEL_READ_ADAPTERS, type ChannelAdapterMap } from './types';
import { channelCatalog } from './registry';

@Controller('v1/channels')
export class ChannelsController {
  constructor(@Inject(CHANNEL_READ_ADAPTERS) private readonly adapters: ChannelAdapterMap) {}

  @Public()
  @Get()
  list() {
    return { items: channelCatalog(this.adapters), write: false };
  }
}
