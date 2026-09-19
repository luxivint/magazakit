import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { MoneyText } from '@/components/ui/MoneyText';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { useCatalog } from '@/context/CatalogContext';
import { formatMoney } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function UrunDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const product = catalog.products.find((p) => p.id === id);
  const [shot, setShot] = useState(0);
  const gallery = product?.imageUrls?.length
    ? product.imageUrls
    : product?.imageUrl
      ? [product.imageUrl]
      : [];
  const hero = gallery[shot] ?? product?.imageUrl ?? null;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.kicker}>Ürün detayı</Text>
        <Text style={styles.title}>{product?.name ?? 'Ürün bulunamadı'}</Text>
        {product ? (
          <Text style={styles.lead}>
            {product.mapped ? `Ana SKU ${product.sku}` : 'Eşleşmedi'} · {product.barcode || 'barkod yok'}
          </Text>
        ) : null}
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet}>
          {product ? (
            <>
              <View style={styles.gallery}>
                {hero ? (
                  <Image source={{ uri: hero }} style={styles.heroImg} accessibilityLabel={product.name} />
                ) : (
                  <View style={styles.heroPlaceholder}>
                    <ProductThumb kind={product.thumb} size={96} />
                    <Text style={styles.muted}>Görsel henüz yok</Text>
                  </View>
                )}
                {gallery.length > 1 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
                    {gallery.map((uri, i) => (
                      <Pressable key={`${uri}-${i}`} onPress={() => setShot(i)}>
                        <Image
                          source={{ uri }}
                          style={[styles.mini, i === shot && styles.miniOn]}
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </View>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.muted}>Kanal fiyatı</Text>
                  <MoneyText value={product.price} size="metric" />
                </View>
                <ChannelBadge channel={product.channel} />
              </View>
              <Text style={styles.status}>
                İlan {product.listing} · {product.statusLabel ?? (product.mapped ? 'Aktif' : 'Eşleşmedi')}
              </Text>

              <Text style={styles.section}>Stok özeti</Text>
              <View style={styles.stockGrid}>
                <StockCell label="Fiziksel" value={product.physical} />
                <StockCell label="Rezerve" value={product.reserved} />
                <StockCell label="Satılabilir" value={product.sellable} warn={product.critical} />
                <StockCell label="Pazaryeri" value={product.marketplaceStock} />
              </View>
              <Text style={styles.note}>
                Pazaryeri adedi fiziksel stok sayılmaz. Eşleşmeyince satılabilir sıfırdır. Stok ve fiyat yazımı bu
                sürümde kapalı.
              </Text>

              <Text style={styles.section}>Kimlik</Text>
              <Row label="İlan" value={product.listingId} />
              <Row label="SKU" value={product.sku} />
              <Row label="Barkod" value={product.barcode || '—'} />
              <Row label="Son eşitleme" value={catalog.lastSync ?? '—'} />

              <Text style={styles.section}>Desi ve tahmini kargo</Text>
              <View style={styles.moneyCard}>
                <Row label="Trendyol desi" value={product.dimensionalWeight != null ? String(product.dimensionalWeight) : 'yok'} />
                <Row label="Ağırlık (kg)" value={product.weightKg != null ? String(product.weightKg) : 'yok'} />
                <Row
                  label="Ölçü (en×boy×yükseklik)"
                  value={
                    product.widthCm && product.lengthCm && product.heightCm
                      ? `${product.widthCm}×${product.lengthCm}×${product.heightCm} cm`
                      : 'yok'
                  }
                />
                <Row label="Hacimsel desi" value={product.volumetricDesi != null ? String(product.volumetricDesi) : 'yok'} />
                <Row label="Faturalanan desi" value={product.billedDesi != null ? String(product.billedDesi) : 'yok'} />
                <Row label="Kargo firması" value={product.cargoProvider || 'Aras (varsayılan tarife)'} />
                <Row
                  label={`Tahmini kargo · ${product.estimateLabel ?? 'tahmini (tarife)'}`}
                  value={product.cargoEstimateTry != null ? formatMoney(product.cargoEstimateTry) : 'yok'}
                />
                <Row
                  label={`PHB 10,99 + KDV · ${product.estimateLabel ?? 'tahmini (tarife)'}`}
                  value={product.phbEstimateTry != null ? formatMoney(product.phbEstimateTry) : 'yok'}
                />
                <Text style={styles.note}>
                  Bu tutarlar sipariş faturası değildir; kesinleşmiş sayılmaz. Kaynak: Mağazalarım tarife v1 (Akademi
                  10 Ağustos 2026 + PHB sayfası).
                </Text>
              </View>

              <Button
                label="Ürünü düzenle"
                icon="create-outline"
                onPress={() => router.push(`/urun/duzenle/${product.id}`)}
              />
              <Button
                label="Eşleştirmeyi düzenle"
                icon="git-compare-outline"
                onPress={() => router.push('/(tabs)/esleme')}
              />
              <Button
                label="Stok güncelle (kapalı)"
                variant="ghost"
                disabled
                onPress={() => undefined}
              />
            </>
          ) : (
            <Text style={styles.note}>Katalogda bu ilan yok. İçeri al ve tekrar dene.</Text>
          )}
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

function StockCell({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, warn && { color: colors.warn }]}>{value}</Text>
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
  lead: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  gallery: { gap: 10 },
  heroImg: { width: '100%', height: 240, borderRadius: radii.card, backgroundColor: colors.skeleton },
  heroPlaceholder: {
    height: 200,
    borderRadius: radii.card,
    backgroundColor: colors.skeleton,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  thumbs: { gap: 8 },
  mini: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.skeleton },
  miniOn: { borderWidth: 2, borderColor: colors.graphite },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  status: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 8 },
  stockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  cellLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  cellValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  muted: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  moneyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
});
