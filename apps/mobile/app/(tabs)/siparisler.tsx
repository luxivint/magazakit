import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { OrderCard } from '@/components/ui/OrderCard';
import { PeachAlert } from '@/components/ui/PeachAlert';
import { SearchField } from '@/components/ui/SearchField';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { SyncFooter } from '@/components/ui/SyncFooter';
import { useCatalog } from '@/context/CatalogContext';
import { formatCount } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

const TABS = [
  { key: 'all', label: 'Tümü' },
  { key: 'hazirlanacak', label: 'Hazırlanacak' },
  { key: 'kargoda', label: 'Kargoda' },
  { key: 'iade', label: 'İade' },
];

export default function SiparislerScreen() {
  const catalog = useCatalog();
  const [tab, setTab] = useState('all');
  const orders = catalog.orders;
  const sourceLabel = catalog.reachable ? (catalog.apiMock ? 'Nest mock' : 'Nest') : 'Nest yok';
  const due = orders.filter((o) => o.dueTone === 'warn').length;

  const visible = useMemo(() => {
    if (tab === 'all') return orders;
    return orders.filter((order) => order.status === tab);
  }, [tab, orders]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <StoreBar />
        <View style={styles.heroPad}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Siparişler</Text>
            <Text style={styles.count}>{formatCount(catalog.loading ? 0 : orders.length)}</Text>
            <Pressable style={styles.ingestBtn} onPress={() => router.push('/(tabs)/icerik-al')}>
              <Text style={styles.ingestText}>İçeri al</Text>
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <SearchField placeholder="Sipariş no veya müşteri ara" />
            <Pressable style={styles.filterBtn} accessibilityLabel="Filtreler">
              <Ionicons name="options-outline" size={18} color={colors.white} />
            </Pressable>
          </View>
          <ChipTabs items={TABS} value={tab} onChange={setTab} />
          <View style={styles.filters}>
            <FilterPill label="Tüm mağazalar" />
            <FilterPill label="Bugün" />
          </View>
        </View>
      </SafeAreaView>

      <PorcelainSheet>
        {catalog.loading ? (
          <View style={styles.sheet}>
            <Text style={styles.loadingLabel}>Siparişler yükleniyor…</Text>
            <OrderSkeleton />
            <OrderSkeleton />
            <OrderSkeleton />
          </View>
        ) : catalog.error ? (
          <ScrollView contentContainerStyle={styles.sheet}>
            <ErrorState title="Siparişler yüklenemedi" body={catalog.error} onRetry={() => catalog.refresh()} />
          </ScrollView>
        ) : catalog.needsShop ? (
          <EmptyState
            title="Önce mağaza bağla"
            body="Trendyol bağlanmadan sipariş okunmaz."
            primary="Mağaza bağla"
            onPrimary={() => router.push('/(tabs)/magaza-bagla')}
          />
        ) : visible.length === 0 ? (
          <ScrollView contentContainerStyle={styles.sheet}>
            <EmptyState
              title="Henüz sipariş yok"
              body="GET /v1/orders boş döndü. Bu bir bağlantı hatası değil."
              primary="İçeri al"
              onPrimary={() => router.push('/(tabs)/icerik-al')}
            />
            <SyncFooter time={catalog.lastSync ?? '—'} source={sourceLabel} />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
            {due > 0 ? <PeachAlert text={`${due} siparişin kargo süresi doluyor`} /> : null}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{tab === 'all' ? 'Siparişler' : TABS.find((t) => t.key === tab)?.label}</Text>
              <Text style={styles.sectionMeta}>{visible.length} sipariş</Text>
            </View>
            {visible.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
            <SyncFooter time={catalog.lastSync ?? '—'} source={sourceLabel} />
          </ScrollView>
        )}
      </PorcelainSheet>
    </View>
  );
}

function FilterPill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
      <Ionicons name="chevron-down" size={12} color={colors.mutedOnDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite },
  heroPad: { paddingHorizontal: space.xl, paddingBottom: 22, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.white, letterSpacing: -0.8 },
  count: { fontFamily: fonts.medium, fontSize: 18, color: colors.mutedOnDark, flex: 1 },
  ingestBtn: {
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  ingestText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.graphite },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#2A2F30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A2F30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  pillText: { color: colors.white, fontFamily: fonts.medium, fontSize: 12 },
  sheet: { padding: space.xl, paddingBottom: 36, gap: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  sectionMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  loadingLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
});
