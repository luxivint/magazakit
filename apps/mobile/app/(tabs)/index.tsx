import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { MoneyText } from '@/components/ui/MoneyText';
import { OrderCard } from '@/components/ui/OrderCard';
import { PeachAlert } from '@/components/ui/PeachAlert';
import { QuickAction } from '@/components/ui/QuickAction';
import { Skeleton } from '@/components/ui/Skeleton';
import { Sparkline } from '@/components/ui/Sparkline';
import { StatusDot } from '@/components/ui/StatusBadge';
import { SyncFooter } from '@/components/ui/SyncFooter';
import { useCatalog } from '@/context/CatalogContext';
import { formatCount } from '@/lib/money';
import { colors, fonts, space } from '@/theme/tokens';

export default function OzetScreen() {
  const catalog = useCatalog();
  const recentOrders = catalog.orders.slice(0, 2);
  const sourceLabel = catalog.reachable ? (catalog.apiMock ? 'Nest mock' : 'Nest') : 'Nest yok';
  const sales = catalog.orders.reduce((sum, o) => sum + o.amount, 0);
  const toPrepare = catalog.orders.filter((o) => o.status === 'hazirlanacak').length;
  const inTransit = catalog.orders.filter((o) => o.status === 'kargoda').length;
  const returns = catalog.orders.filter((o) => o.status === 'iade').length;
  const due = catalog.orders.filter((o) => o.dueTone === 'warn').length;
  const spark = catalog.orders.length ? catalog.orders.map((o) => Math.max(8, o.amount / 40)) : [8, 8, 8, 8, 8];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <StoreBar />
        <View style={styles.heroPad}>
          <View style={styles.segment}>
            <Text style={styles.segmentOn}>Genel bakış</Text>
            <View style={styles.segmentLine} />
          </View>
          <View style={styles.today}>
            <Text style={styles.todayText}>Bugün</Text>
            <Ionicons name="chevron-down" size={12} color={colors.mutedOnDark} />
          </View>
          <Text style={styles.kicker}>Toplam satış</Text>
          <View style={styles.metricRow}>
            <MoneyText value={sales} size="display" onDark digits={0} />
            <Sparkline points={spark} />
          </View>
          <Text style={styles.delta}>
            {catalog.orders.length === 0 ? 'İçeri alınan sipariş yok' : 'Nest listesi · tahmini kazanç yok'}
          </Text>
          <View style={styles.subMetric}>
            <Text style={styles.subValue}>{formatCount(catalog.orders.length)}</Text>
            <Text style={styles.subLabel}>Sipariş</Text>
          </View>
          <View style={styles.actions}>
            <QuickAction label="İçeri al" icon="download-outline" lime onPress={() => router.push('/(tabs)/icerik-al')} />
            <QuickAction label="Eşleştir" icon="swap-horizontal-outline" onPress={() => router.push('/(tabs)/esleme')} />
            <QuickAction label="Ürünler" icon="grid-outline" onPress={() => router.push('/(tabs)/urunler')} />
          </View>
        </View>
      </SafeAreaView>

      <PorcelainSheet>
        {catalog.loading ? (
          <View style={styles.sheetPad}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="100%" height={44} radius={22} />
            <Skeleton width="100%" height={64} radius={16} />
            <Skeleton width="100%" height={72} radius={16} />
          </View>
        ) : catalog.error ? (
          <ErrorState title="Özet yüklenemedi" body={catalog.error} onRetry={() => catalog.refresh()} />
        ) : catalog.needsShop || recentOrders.length === 0 ? (
          <ScrollView contentContainerStyle={styles.sheetPad} showsVerticalScrollIndicator={false}>
            <EmptyState
              title={catalog.needsShop ? 'Mağaza bağlı değil' : 'Bugün işlem yok'}
              body={
                catalog.needsShop
                  ? 'Trendyol bağla, sonra içeri al. Örnek satış gösterilmez.'
                  : 'GET /v1/orders henüz sipariş döndürmedi.'
              }
              primary={catalog.needsShop ? 'Mağaza bağla' : 'İçeri al'}
              onPrimary={() => router.push(catalog.needsShop ? '/(tabs)/magaza-bagla' : '/(tabs)/icerik-al')}
            />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.sheetPad} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Operasyon</Text>
              <Text style={styles.sectionMeta}>Nest</Text>
            </View>
            {due > 0 ? <PeachAlert text={`${due} siparişin kargo süresi doluyor`} /> : null}
            <View style={styles.ops}>
              <OpStat value={toPrepare} label="Hazırlanacak" tone="warn" />
              <OpStat value={inTransit} label="Kargoda" tone="idle" />
              <OpStat value={returns} label="İade" tone="idle" />
            </View>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Son siparişler</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
            {recentOrders.map((order) => (
              <OrderCard key={order.id} order={order} compact />
            ))}
            <SyncFooter time={catalog.lastSync ?? '—'} source={sourceLabel} />
          </ScrollView>
        )}
      </PorcelainSheet>
    </View>
  );
}

function OpStat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'warn' | 'idle';
}) {
  return (
    <View style={styles.op}>
      <Text style={styles.opValue}>{value}</Text>
      <StatusDot tone={tone} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite },
  heroPad: { paddingHorizontal: space.xl, paddingBottom: 28 },
  segment: { alignSelf: 'flex-start', marginBottom: 8 },
  segmentOn: { color: colors.white, fontFamily: fonts.semibold, fontSize: 14 },
  segmentLine: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.lime,
    width: 84,
  },
  today: {
    position: 'absolute',
    right: space.xl,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2A2F30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  todayText: { color: colors.white, fontFamily: fonts.medium, fontSize: 12 },
  kicker: { color: colors.mutedOnDark, fontFamily: fonts.medium, fontSize: 13, marginTop: 10 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  delta: { color: colors.lime, fontFamily: fonts.semibold, fontSize: 13, marginTop: 4 },
  subMetric: { marginTop: 18 },
  subValue: { color: colors.white, fontFamily: fonts.bold, fontSize: 22 },
  subLabel: { color: colors.mutedOnDark, fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-start', gap: 18, marginTop: 22 },
  sheetPad: { padding: space.xl, paddingBottom: 32, gap: 14 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  sectionMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  ops: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  op: { flex: 1, gap: 6 },
  opValue: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink, letterSpacing: -0.6 },
});
