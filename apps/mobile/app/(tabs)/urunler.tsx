import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { useCatalog } from '@/context/CatalogContext';
import { catalogSourceLabel } from '@/lib/mapCatalog';
import { formatCount } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

const TABS = [
  { key: 'all', label: 'Tümü' },
  { key: 'critical', label: 'Kritik stok' },
];

export default function UrunlerScreen() {
  const catalog = useCatalog();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const products = catalog.products;
  const sourceLabel = catalogSourceLabel(catalog.reachable, catalog.apiMock);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (tab === 'critical' && !p.critical) return false;
      if (!needle) return true;
      return `${p.name} ${p.sku} ${p.barcode} ${p.listingId}`.toLowerCase().includes(needle);
    });
  }, [tab, products, q]);

  const criticalCount = products.filter((p) => p.critical).length;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <StoreBar />
        <View style={styles.heroPad}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Ürünler</Text>
              <Text style={styles.count}>{formatCount(catalog.loading ? 0 : products.length)} ürün</Text>
            </View>
            <Pressable style={styles.ingestBtn} onPress={() => router.push('/(tabs)/icerik-al')}>
              <Ionicons name="download-outline" size={16} color={colors.graphite} />
              <Text style={styles.ingestText}>İçeri al</Text>
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <SearchField
              placeholder="Ürün adı, barkod veya SKU"
              value={q}
              onChangeText={setQ}
            />
            <Pressable style={styles.filterBtn} accessibilityLabel="Görünüm">
              <Ionicons name="filter-outline" size={18} color={colors.white} />
            </Pressable>
          </View>
          <ChipTabs items={TABS} value={tab} onChange={setTab} />
          <View style={styles.filters}>
            <FilterPill label="Tüm mağazalar" />
            <Pressable onPress={() => router.push('/(tabs)/esleme')}>
              <FilterPill label="Eşleştirme" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <PorcelainSheet>
        {catalog.loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
            <OrderSkeleton />
            <OrderSkeleton />
          </View>
        ) : catalog.error ? (
          <ErrorState
            title="Ürünler yüklenemedi"
            body={catalog.error}
            onRetry={() => catalog.refresh()}
          />
        ) : catalog.needsShop ? (
          <EmptyState
            title="Önce mağaza bağla"
            body="Trendyol bağlanmadan katalog okunmaz. Yerel örnek gösterilmez."
            primary="Mağaza bağla"
            onPrimary={() => router.push('/(tabs)/magaza-bagla')}
          />
        ) : products.length === 0 ? (
          <EmptyState
            title="Henüz ürün yok"
            body="İçeri alınınca ürünler gelir. Boş liste hata değildir."
            primary="İçeri al"
            secondary="Eşleştir"
            onPrimary={() => router.push('/(tabs)/icerik-al')}
            onSecondary={() => router.push('/(tabs)/esleme')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} showsVerticalScrollIndicator={false}>
            {criticalCount > 0 ? (
              <PeachAlert text={`${criticalCount} ürünün satılabilir stoğu kritik`} />
            ) : null}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Ürün kataloğu</Text>
              <Pressable onPress={() => router.push('/(tabs)/esleme')}>
                <Text style={styles.link}>Eşleştir</Text>
              </Pressable>
            </View>
            {visible.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
            <View style={styles.footerRow}>
              <SyncFooter time={catalog.lastSync ?? '—'} source={sourceLabel} />
              <Pressable style={styles.refresh} onPress={() => catalog.refresh()}>
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
  ingestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  ingestText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.graphite },
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
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
