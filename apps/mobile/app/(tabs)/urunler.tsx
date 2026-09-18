import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { ChipTabs } from '@/components/ui/ChipTabs';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { PeachAlert } from '@/components/ui/PeachAlert';
import { ProductRow } from '@/components/ui/ProductRow';
import { SearchField } from '@/components/ui/SearchField';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { SyncFooter } from '@/components/ui/SyncFooter';
import { useDemoState } from '@/context/DemoStateContext';
import { products, summary } from '@/data/mock';
import { formatCount } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

const TABS = [
  { key: 'all', label: 'Tümü' },
  { key: 'critical', label: 'Kritik stok' },
];

export default function UrunlerScreen() {
  const { state, setState } = useDemoState();
  const [tab, setTab] = useState('all');

  const visible = useMemo(() => {
    if (tab === 'critical') return products.filter((p) => p.critical);
    return products;
  }, [tab]);

  const criticalCount = products.filter((p) => p.critical).length;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <StoreBar />
        <View style={styles.heroPad}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Ürünler</Text>
              <Text style={styles.count}>{formatCount(state === 'empty' ? 0 : products.length)} ürün</Text>
            </View>
          </View>
          <View style={styles.searchRow}>
            <SearchField placeholder="Ürün adı, barkod veya SKU" />
            <Pressable style={styles.filterBtn} accessibilityLabel="Görünüm">
              <Ionicons name="filter-outline" size={18} color={colors.white} />
            </Pressable>
          </View>
          <ChipTabs items={TABS} value={tab} onChange={setTab} />
          <View style={styles.filters}>
            <FilterPill label="Tüm mağazalar" />
            <FilterPill label="Kategori" />
          </View>
        </View>
      </SafeAreaView>

      <PorcelainSheet>
        {state === 'loading' ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
            <OrderSkeleton />
            <OrderSkeleton />
          </View>
        ) : state === 'error' ? (
          <ErrorState
            title="Ürünler yüklenemedi"
            body="Katalog okunamadı. Bu ekran boş katalog anlamına gelmez; yeniden dene."
            onRetry={() => setState('sample')}
          />
        ) : state === 'empty' ? (
          <EmptyState
            title="Henüz ürün yok"
            body="Trendyol kataloğu içeri alınınca ürünler burada listelenir. Yeni ürün ekleme F4’e kadar kapalı."
            primary="Yenile"
            onPrimary={() => setState('sample')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
            {criticalCount > 0 ? (
              <PeachAlert text={`${criticalCount} ürünün stoğu kritik seviyede`} />
            ) : null}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Ürün kataloğu</Text>
              <Ionicons name="swap-vertical-outline" size={16} color={colors.muted} />
            </View>
            {visible.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
            <View style={styles.footerRow}>
              <SyncFooter time={summary.lastSync} />
              <Pressable style={styles.refresh}>
                <Ionicons name="refresh" size={14} color={colors.muted} />
                <Text style={styles.refreshText}>Yenile</Text>
              </Pressable>
            </View>
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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.white, letterSpacing: -0.8 },
  count: { fontFamily: fonts.medium, fontSize: 14, color: colors.mutedOnDark, marginTop: 2 },
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
  sheet: { padding: space.xl, paddingBottom: 36, gap: 4 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
