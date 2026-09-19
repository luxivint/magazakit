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
import { catalogSourceLabel } from '@/lib/mapCatalog';
import { formatCount } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

const TABS = [
  { key: 'all', label: 'Tümü' },
  { key: 'hazirlanacak', label: 'Hazırlanacak' },
  { key: 'kargoda', label: 'Kargoda' },
  { key: 'tamamlandi', label: 'Tamamlandı' },
  { key: 'iade', label: 'İade' },
];

const DATE_FILTERS = [
  { key: 'all', label: 'Tüm zamanlar', days: null as number | null },
  { key: '14', label: '14 gün', days: 14 },
  { key: '90', label: '90 gün', days: 90 },
  { key: 'today', label: 'Bugün', days: 0 },
];

export default function SiparislerScreen() {
  const catalog = useCatalog();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [dateKey, setDateKey] = useState('all');
  const orders = catalog.orders;
  const sourceLabel = catalogSourceLabel(catalog.reachable, catalog.apiMock);
  const dateFilter = DATE_FILTERS.find((d) => d.key === dateKey) ?? DATE_FILTERS[0];
  const due = orders.filter((o) => o.dueTone === 'warn').length;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const now = Date.now();
    return orders.filter((order) => {
      if (tab !== 'all' && order.status !== tab) return false;
      if (needle) {
        const hay = `${order.number} ${order.customer} ${order.product}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (dateFilter.days === 0) {
        const d = new Date(order.createdAt);
        const t = new Date();
        if (d.toDateString() !== t.toDateString()) return false;
      } else if (dateFilter.days != null) {
        const created = new Date(order.createdAt).getTime();
        if (now - created > dateFilter.days * 86_400_000) return false;
      }
      return true;
    });
  }, [tab, orders, q, dateFilter]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <StoreBar />
        <View style={styles.heroPad}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Siparişler</Text>
            <Text style={styles.count}>{formatCount(catalog.loading ? 0 : orders.length)}</Text>
          </View>
          <View style={styles.searchRow}>
            <SearchField
              placeholder="Sipariş no veya müşteri ara"
              value={q}
              onChangeText={setQ}
            />
            <Pressable style={styles.filterBtn} accessibilityLabel="Filtreler">
              <Ionicons name="options-outline" size={18} color={colors.white} />
            </Pressable>
          </View>
          <ChipTabs items={TABS} value={tab} onChange={setTab} />
          <View style={styles.filters}>
            <FilterPill label="Tüm mağazalar" />
            <Pressable
              onPress={() => {
                const i = DATE_FILTERS.findIndex((d) => d.key === dateKey);
                setDateKey(DATE_FILTERS[(i + 1) % DATE_FILTERS.length].key);
              }}>
              <FilterPill label={dateFilter.label} />
            </Pressable>
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
        ) : orders.length === 0 ? (
          <ScrollView contentContainerStyle={styles.sheet}>
            <EmptyState
              title="Henüz sipariş yok"
              body="Yeni siparişler kendiliğinden gelir."
            />
            <SyncFooter time={catalog.lastSync ?? '—'} source={sourceLabel} />
          </ScrollView>
        ) : visible.length === 0 ? (
          <ScrollView contentContainerStyle={styles.sheet}>
            <EmptyState
              title="Filtreye uyan sipariş yok"
              body="Tarih veya aramayı genişlet. Kayıtlar silinmedi."
              primary="Tüm zamanlar"
              onPrimary={() => {
                setDateKey('all');
                setTab('all');
                setQ('');
              }}
            />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
            {due > 0 ? <PeachAlert text={`${due} siparişin kargo süresi doluyor`} /> : null}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{tab === 'all' ? 'Siparişler' : TABS.find((t) => t.key === tab)?.label}</Text>
              <Text style={styles.sectionMeta}>{visible.length} sipariş</Text>
            </View>
            {visible.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => router.push(`/siparis/${order.id}`)}
              />
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
