import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { PeachAlert } from '@/components/ui/PeachAlert';
import { useCatalog } from '@/context/CatalogContext';
import { useShops } from '@/context/ShopContext';
import { API_URL } from '@/lib/api';
import { colors, fonts, space } from '@/theme/tokens';

export default function IcerikAlScreen() {
  const { shops } = useShops();
  const catalog = useCatalog();
  const shop = shops[0];
  const [note, setNote] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <BrandMark />
        <Text style={styles.headline}>Ürünleri içeri al</Text>
        <Text style={styles.lead}>POST /v1/shops/:id/sync — mock, idempotent. Liste senkten sonra dolar.</Text>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet}>
          {shop?.mock ? <PeachAlert text="K01 mock — gerçek Trendyol anahtarı yok" /> : null}
          <Text style={styles.section}>Kaynak</Text>
          <Text style={styles.body}>
            {shop ? `${shop.sellerLabel} · ${shop.id}` : 'Bağlı mağaza yok'}. Bearer Firebase ID token. GET {API_URL}
            /v1/products ve /v1/orders org kapsamında; senkten önce boş.
          </Text>
          <Text style={styles.meta}>Son senk: {shop?.lastSyncAt ?? catalog.lastSync ?? 'henüz yok'}</Text>
          <Text style={styles.meta}>
            {catalog.products.length} ürün · {catalog.orders.length} sipariş
            {catalog.lastIngest
              ? ` · +${catalog.lastIngest.productsUpserted} ürün / +${catalog.lastIngest.ordersUpserted} sipariş`
              : ''}
          </Text>
          {catalog.error ? <ConfigBanner text={catalog.error} /> : null}
          {note ? <Text style={styles.meta}>{note}</Text> : null}
          <Button
            label="İçeri al"
            icon="download-outline"
            trailing="arrow-forward"
            loading={catalog.ingesting}
            onPress={() => {
              if (!shop) {
                router.push('/(tabs)/magaza-bagla');
                return;
              }
              setNote(null);
              void catalog
                .ingest()
                .then((r) => {
                  setNote(`Upsert ${r.productsUpserted} ürün, ${r.ordersUpserted} sipariş. ${r.checkpoint}`);
                  router.replace('/(tabs)/urunler');
                })
                .catch(() => undefined);
            }}
          />
          <Button label="Eşleştirmeyi aç" variant="ghost" onPress={() => router.push('/(tabs)/esleme')} />
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite, paddingHorizontal: space.xl, paddingBottom: 22, paddingTop: 8 },
  back: { width: 36, height: 36, justifyContent: 'center', marginBottom: 8 },
  headline: { marginTop: 8, fontFamily: fonts.bold, fontSize: 26, color: colors.white, letterSpacing: -0.5 },
  lead: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
});
