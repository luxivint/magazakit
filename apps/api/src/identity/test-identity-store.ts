import { createChannelAdapters } from '../channels/registry';
import { MockTrendyolReadAdapter } from '../trendyol/mock-trendyol-read.adapter';
import type { IdentityRepository } from './identity.repository';
import { MemoryIdentityRepository } from './memory-identity.repository';
import { IdentityStore } from './identity.store';

export function testIdentityStore(repo: IdentityRepository = new MemoryIdentityRepository()): IdentityStore {
  return new IdentityStore(repo, createChannelAdapters(new MockTrendyolReadAdapter()));
}
