import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Order } from '@/data/mock';
import { colors, fonts, radii } from '@/theme/tokens';

import { ChannelBadge } from './ChannelBadge';
import { MoneyText } from './MoneyText';
import { ProductThumb } from './ProductThumb';
import { StatusDot } from './StatusBadge';

export function OrderCard({
  order,
  compact = false,
  onPress,
}: {
  order: Order;
  compact?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <ProductThumb kind={order.thumb} />
      <View style={styles.mid}>
        <View style={styles.topLine}>
          <ChannelBadge channel={order.channel} />
          <Text style={styles.number}>{order.number}</Text>
        </View>
        {compact ? (
          <Text style={styles.meta}>{order.channelLabel}</Text>
        ) : (
          <>
            <Text style={styles.product} numberOfLines={1}>
              {order.product}
            </Text>
            <Text style={styles.meta}>
              {order.customer} · {order.qty} adet
            </Text>
            <View style={styles.due}>
              <Ionicons
                name="time-outline"
                size={13}
                color={order.dueTone === 'warn' ? colors.warn : colors.muted}
              />
              <Text style={[styles.dueText, order.dueTone === 'warn' && { color: colors.warn }]}>
                {order.due}
              </Text>
            </View>
          </>
        )}
      </View>
      <View style={styles.right}>
        {compact ? null : <Text style={styles.time}>{order.time}</Text>}
        <MoneyText value={order.amount} />
        {compact ? (
          <StatusDot tone={order.status === 'kargoda' ? 'idle' : 'warn'} label={order.statusLabel} />
        ) : (
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Hazırla</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.white} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  mid: { flex: 1, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  number: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  product: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  due: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dueText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  right: { alignItems: 'flex-end', gap: 6, minWidth: 88 },
  time: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  cta: {
    marginTop: 4,
    backgroundColor: colors.graphite,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
});
