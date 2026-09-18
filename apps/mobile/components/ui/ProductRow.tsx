import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Product } from '@/data/mock';
import { colors, fonts } from '@/theme/tokens';

import { ChannelBadge } from './ChannelBadge';
import { MoneyText } from './MoneyText';
import { ProductThumb } from './ProductThumb';

export function ProductRow({ product }: { product: Product }) {
  return (
    <Pressable style={styles.row}>
      <ProductThumb kind={product.thumb} />
      <View style={styles.mid}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.sku}>SKU: {product.sku}</Text>
        <View style={styles.meta}>
          <ChannelBadge />
          <Text style={styles.stock}>Stok {product.stock}</Text>
        </View>
      </View>
      <View style={styles.right}>
        <MoneyText value={product.price} />
        <Text style={styles.listing}>{product.listing}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  mid: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  sku: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  stock: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  right: { alignItems: 'flex-end', gap: 4 },
  listing: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
});
