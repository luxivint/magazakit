import type { MockListingSeed } from '../trendyol/mock-feed';
import { channelFetchBytes } from '../channels/http';
import {
  isR2PublicUrl,
  objectKeyForListing,
  putR2Object,
  readR2Config,
  type R2Config,
} from './r2';

type FetchBytes = typeof channelFetchBytes;
type PutObject = typeof putR2Object;

export async function mirrorListingImages(
  orgId: string,
  listings: MockListingSeed[],
  deps: {
    config?: R2Config | null;
    fetchBytes?: FetchBytes;
    put?: PutObject;
  } = {},
): Promise<MockListingSeed[]> {
  const config = deps.config === undefined ? readR2Config() : deps.config;
  if (!config) return listings;
  const fetchBytes = deps.fetchBytes ?? channelFetchBytes;
  const put = deps.put ?? putR2Object;
  const out: MockListingSeed[] = [];
  for (const listing of listings) {
    out.push(await mirrorOne(orgId, listing, config, fetchBytes, put));
  }
  return out;
}

async function mirrorOne(
  orgId: string,
  listing: MockListingSeed,
  config: R2Config,
  fetchBytes: FetchBytes,
  put: PutObject,
): Promise<MockListingSeed> {
  const sources = [
    listing.imageUrl,
    ...(listing.imageUrls ?? []),
  ].filter((u): u is string => !!u);
  if (sources.length === 0) return listing;
  const mirrored: string[] = [];
  for (const source of sources) {
    if (isR2PublicUrl(config, source)) {
      if (!mirrored.includes(source)) mirrored.push(source);
      continue;
    }
    try {
      const { bytes, contentType } = await fetchBytes(source, { method: 'GET' }, 'listing image');
      const type = contentType.startsWith('image/')
        ? contentType.split(';')[0]
        : 'image/jpeg';
      const key = objectKeyForListing(orgId, listing.id, type, source);
      const stored = await put(config, key, bytes, type);
      if (!mirrored.includes(stored)) mirrored.push(stored);
    } catch {
      if (!mirrored.includes(source)) mirrored.push(source);
    }
  }
  return {
    ...listing,
    imageUrl: mirrored[0] ?? null,
    imageUrls: mirrored,
  };
}
