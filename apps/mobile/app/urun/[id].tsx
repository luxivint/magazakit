import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { MoneyText } from '@/components/ui/MoneyText';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { useCatalog } from '@/context/CatalogContext';
import { colors, fonts, space } from '@/theme/tokens';

export default function UrunDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products } = useCatalog();
  const product = products.find((p) => p.id === id);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.kicker}>Ürün</Text>
        <Text style={styles.title}>{product?.name ?? 'Ürün bulunamadı'}</Text>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet}>
          {product ? (
            <>
              <ProductThumb kind={product.thumb} />
              <ChannelBadge />
              <MoneyText value={product.price} />
              <Row label="İlan" value={product.listingId} />
              <Row label="Ana SKU" value={product.mapped ? product.sku : 'eşleşmedi'} />
              <Row label="Pazaryeri adedi" value={String(product.marketplaceStock)} />
              <Row label="Barkod" value={product.barcode || '—'} />
              <Row label="Fiziksel" value={String(product.physical)} />
              <Row label="Rezerve" value={String(product.reserved)} />
              <Row label="Satılabilir" value={String(product.sellable)} />
              <Text style={styles.note}>
                Pazaryeri adedi fiziksel stok sayılmaz. Eşleşmeyince satılabilir sıfırdır.
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/esleme')}>
                <Text style={styles.link}>Eşleştirmeyi düzenle</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.note}>Katalogda bu ilan yok. İçeri al ve tekrar dene.</Text>
          )}
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite, paddingHorizontal: space.xl, paddingBottom: 22 },
  back: { width: 36, height: 36, justifyContent: 'center', marginBottom: 8 },
  kicker: { fontFamily: fonts.medium, fontSize: 13, color: colors.mutedOnDark },
  title: { marginTop: 6, fontFamily: fonts.bold, fontSize: 26, color: colors.white, letterSpacing: -0.5 },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
});
