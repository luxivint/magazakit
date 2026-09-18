import { Ionicons } from '@expo/vector-icons';
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
import { useDemoState } from '@/context/DemoStateContext';
import { recentOrders, sparkline, summary } from '@/data/mock';
import { formatCount } from '@/lib/money';
import { colors, fonts, space } from '@/theme/tokens';

export default function OzetScreen() {
  const { state, setState } = useDemoState();

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
            <MoneyText value={state === 'empty' ? 0 : summary.sales} size="display" onDark digits={0} />
            <Sparkline points={state === 'empty' ? [8, 8, 8, 8, 8] : sparkline} />
          </View>
          <Text style={styles.delta}>
            {state === 'empty' ? 'Bugün henüz satış yok' : `+%${summary.salesDelta.toString().replace('.', ',')} düne göre`}
          </Text>
          <View style={styles.subMetric}>
            <Text style={styles.subValue}>{formatCount(state === 'empty' ? 0 : summary.orderCount)}</Text>
            <Text style={styles.subLabel}>Sipariş</Text>
          </View>
          <View style={styles.actions}>
            <QuickAction label="Barkod okut" icon="barcode-outline" lime />
            <QuickAction label="Etiket" icon="pricetag-outline" />
          </View>
        </View>
      </SafeAreaView>

      <PorcelainSheet>
        {state === 'loading' ? (
          <View style={styles.sheetPad}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="100%" height={44} radius={22} />
            <Skeleton width="100%" height={64} radius={16} />
            <Skeleton width="100%" height={72} radius={16} />
          </View>
        ) : state === 'error' ? (
          <ErrorState
            title="Özet yüklenemedi"
            body="Sunucudan yanıt alınamadı. Biraz sonra yeniden deneyebilirsin."
            onRetry={() => setState('sample')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheetPad} showsVerticalScrollIndicator={false}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Operasyon</Text>
              <Text style={styles.sectionMeta}>Bugün</Text>
            </View>
            {state === 'empty' ? (
              <EmptyState
                title="Bugün işlem yok"
                body="Bağlı Trendyol mağazasında henüz sipariş veya uyarı görünmüyor."
                primary="Yenile"
                onPrimary={() => setState('sample')}
              />
            ) : (
              <>
                <PeachAlert text={`${summary.shippingDue} siparişin kargo süresi doluyor`} />
                <View style={styles.ops}>
                  <OpStat value={summary.toPrepare} label="Hazırlanacak" tone="warn" />
                  <OpStat value={summary.inTransit} label="Kargoda" tone="idle" />
                  <OpStat value={summary.returns} label="İade" tone="idle" />
                </View>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Son siparişler</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>
                {recentOrders.map((order) => (
                  <OrderCard key={order.id} order={order} compact />
                ))}
                <SyncFooter stores={summary.connectedStores} time={summary.lastSync} />
              </>
            )}
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
