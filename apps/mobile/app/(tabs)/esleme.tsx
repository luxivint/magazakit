import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useCatalog } from '@/context/CatalogContext';
import { useMappings } from '@/context/MappingContext';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function EslemeScreen() {
  const catalog = useCatalog();
  const { skuOf, setSku } = useMappings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of catalog.products) {
      next[p.id] = skuOf(p.id) ?? p.listingSku;
    }
    setDraft(next);
  }, [catalog.products, skuOf]);

  const save = () => {
    for (const p of catalog.products) {
      const sku = (draft[p.id] ?? p.listingSku).trim();
      setSku(p.id, sku);
    }
    setSaved(true);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Eşleştirme</Text>
          <Text style={styles.sub}>İlan → ana SKU. Öneri motoru yok (E-17 kapalı).</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {catalog.products.length === 0 ? (
          <EmptyState
            title="Önce içeri al"
            body="Eşleştirilecek ilan yok. GET /v1/products boş veya mağaza bağlı değil."
            primary="İçeri al"
            onPrimary={() => router.push('/(tabs)/icerik-al')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.k02}>
              K02: pazaryeri adedi fiziksel stok sayılmaz. Kaynak Trendyol ilanı; sen ana SKU’yu yazarsın.
            </Text>
            {catalog.products.map((p) => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>İlan SKU: {p.listingSku} · barkod {p.barcode || '—'}</Text>
                <TextField
                  label="Ana SKU"
                  value={draft[p.id] ?? ''}
                  onChangeText={(text) => {
                    setSaved(false);
                    setDraft((prev) => ({ ...prev, [p.id]: text }));
                  }}
                  autoCapitalize="characters"
                  placeholder={p.listingSku}
                />
              </View>
            ))}
            {saved ? <Text style={styles.ok}>Eşleştirme kaydedildi. Öneri üretilmedi.</Text> : null}
            <Button label="Eşleştirmeyi kaydet" onPress={save} />
          </ScrollView>
        )}
      </PorcelainSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite },
  back: { marginLeft: space.lg, width: 36, height: 36, justifyContent: 'center' },
  heroPad: { paddingHorizontal: space.xl, paddingBottom: 22, gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.white, letterSpacing: -0.8 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 14, paddingBottom: 40 },
  k02: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
  },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  ok: { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
});
