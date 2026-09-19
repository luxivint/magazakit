import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OrganizationSummary } from '@/lib/api';

function key(uid: string): string {
  return `magazam.org.${uid}`;
}

export async function readCachedOrg(uid: string): Promise<OrganizationSummary | null> {
  try {
    const raw = await AsyncStorage.getItem(key(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrganizationSummary;
    if (!parsed?.id || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCachedOrg(uid: string, org: OrganizationSummary): Promise<void> {
  try {
    await AsyncStorage.setItem(key(uid), JSON.stringify(org));
  } catch {
    /* ignore quota */
  }
}

export async function clearCachedOrg(uid: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(uid));
  } catch {
    /* ignore */
  }
}
