import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { catalogSourceLabel } from '@/lib/mapCatalog';
import { formatCount } from '@/lib/money';
import { colors, fonts, space } from '@/theme/tokens';

export default function OzetScreen() {
  const catalog = useCatalog();
  const recentOrders = catalog.orders.slice(0, 2);
  const sourceLabel = catalogSourceLabel(catalog.reachable, catalog.apiMock);
  const sales = catalog.orders.reduce((sum, o) => sum + o.amount, 0);
  const toPrepare = catalog.orders.filter((o) => o.status === 'hazirlanacak').length;
  const inTransit = catalog.orders.filter((o) => o.status === 'kargoda').length;
  const completed = catalog.orders.filter((o) => o.status === 'tamamlandi').length;
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
            {catalog.orders.length === 0 ? 'İçeri alınan sipariş yok' : 'Tahmini kazanç yok'}
          </Text>
          <View style={styles.subMetric}>
            <Text style={styles.subValue}>{formatCount(catalog.orders.length)}</Text>
            <Text style={styles.subLabel}>Sipariş</Text>
          </View>
          <View style={styles.actions}>
            <QuickAction label="Hazırla" icon="barcode-outline" lime onPress={() => {
              const first = catalog.orders.find((o) => o.status === 'hazirlanacak');
              if (first) router.push(`/siparis/${first.id}`);
              else router.push('/(tabs)/siparisler');
            }} />
            <QuickAction label="Stok" icon="cube-outline" onPress={() => router.push('/(tabs)/stok')} />
            <QuickAction label="İşlemler" icon="list-outline" onPress={() => router.push('/(tabs)/islem')} />
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
                  ? 'Trendyol bağla. Siparişler otomatik gelir.'
                  : 'Siparişler kısa sürede burada görünür.'
              }
              primary={catalog.needsShop ? 'Mağaza bağla' : undefined}
              onPrimary={catalog.needsShop ? () => router.push('/(tabs)/magaza-bagla') : undefined}
            />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.sheetPad} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Operasyon</Text>
              <Text style={styles.sectionMeta}>Bugün</Text>
            </View>
            {due > 0 ? <PeachAlert text={`${due} siparişin kargo süresi doluyor`} /> : null}
            <View style={styles.ops}>
              <OpStat value={toPrepare} label="Hazırlanacak" tone="warn" />
              <OpStat value={inTransit} label="Kargoda" tone="idle" />
              <OpStat value={completed} label="Tamamlandı" tone="success" />
            </View>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>İşletme</Text>
            </View>
            <Pressable style={styles.linkRow} onPress={() => router.push('/(tabs)/raporlar')}>
              <Text style={styles.linkLabel}>Raporlar</Text>
              <Text style={styles.linkMeta}>sipariş / stok farkı</Text>
            </Pressable>
            <Pressable style={styles.linkRow} onPress={() => router.push('/(tabs)/ekip')}>
              <Text style={styles.linkLabel}>Ekip</Text>
              <Text style={styles.linkMeta}>davet</Text>
            </Pressable>
            <Pressable style={styles.linkRow} onPress={() => router.push('/(tabs)/abonelik')}>
              <Text style={styles.linkLabel}>Abonelik</Text>
              <Text style={styles.linkMeta}>ödeme yok</Text>
            </Pressable>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Son siparişler</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
            {recentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                compact
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

function OpStat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'warn' | 'idle' | 'success';
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  linkLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  linkMeta: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
