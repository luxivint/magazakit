import { PostgresIdentityRepository } from './postgres-identity.repository';
import { testIdentityStore } from './test-identity-store';

const DATABASE_CANDIDATES = [
  process.env.DATABASE_URL?.trim(),
  'postgres://magazakit:magazakit@127.0.0.1:5433/magazakit',
  'postgres://magazakit:magazakit@127.0.0.1:5432/magazakit',
].filter((v): v is string => Boolean(v));

describe('PostgresIdentityRepository durability', () => {
  it('persists org, FCM token, catalog, mapping, stock, reservation, operations', async () => {
    let repo: PostgresIdentityRepository | undefined;
    let databaseUrl = '';
    for (const candidate of DATABASE_CANDIDATES) {
      try {
        repo = await PostgresIdentityRepository.connect(candidate);
        databaseUrl = candidate;
        break;
      } catch {
        /* try next host/port */
      }
    }
    if (!repo) {
      console.warn(
        'Skipping Postgres durability test (docker compose up -d postgres; set DATABASE_URL).',
      );
      return;
    }

    const uid = `uid-pg-${Date.now()}`;
    const store = testIdentityStore(repo);
    const org = await store.createOrg(uid, 'PG Mağaza');
    await store.saveDevice(uid, 'fcm-durable-token');
    const shop = await store.connectTrendyolMock(uid);
    await store.syncShop(uid, shop.id);
    await store.upsertMapping(uid, 'ty-p-1001', 'MASTER-TSHIRT');
    await store.upsertMapping(uid, 'ty-p-1002', 'MASTER-HOODIE');
    await store.adjustStock(uid, {
      sku: 'MASTER-TSHIRT',
      deltaPhysical: 10,
      idempotencyKey: `pg-adj-t-${uid}`,
    });
    await store.adjustStock(uid, {
      sku: 'MASTER-HOODIE',
      deltaPhysical: 5,
      idempotencyKey: `pg-adj-h-${uid}`,
    });
    const reserved = await store.reserveOrder(uid, 'ty-o-5001', `pg-res-${uid}`);
    expect(reserved.reserved).toBe(true);

    const again = await PostgresIdentityRepository.connect(databaseUrl);
    expect(again.backend).toBe('postgres');
    expect((await again.getOrgForUid(uid))?.id).toBe(org.id);
    expect(await again.getDeviceToken(uid)).toBe('fcm-durable-token');
    expect((await again.listListings(org.id)).length).toBe(3);
    expect((await again.listMappings(org.id)).some((m) => m.sku === 'MASTER-TSHIRT')).toBe(true);
    const order = await again.getOrder(org.id, 'ty-o-5001');
    expect(order?.reserved).toBe(true);
    expect(order?.reservationKey).toBe(`pg-res-${uid}`);
    const stock = await again.getSkuStock(org.id, 'MASTER-TSHIRT');
    expect(stock.physicalStock).toBe(10);
    expect(stock.reservedStock).toBe(1);
    expect(stock.sellableStock).toBe(9);
    expect((await again.listMovements(org.id)).length).toBeGreaterThan(0);
    expect((await again.listOperations(org.id)).length).toBeGreaterThan(0);
    await again.close();
    await repo.close();
  }, 20000);
});
