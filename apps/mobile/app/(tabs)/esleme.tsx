import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { useCatalog } from '@/context/CatalogContext';
import { useMappings } from '@/context/MappingContext';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function EslemeScreen() {
  const catalog = useCatalog();
  const { skuOf, saveSku, error: mapError } = useMappings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of catalog.products) {
      next[p.listingId] = skuOf(p.listingId) ?? (p.mapped ? p.sku : '');
    }
    setDraft(next);
  }, [catalog.products, skuOf]);

  const save = async () => {
    setBusy(true);
    setFormError(null);
    setSaved(false);
    try {
      for (const p of catalog.products) {
        const sku = (draft[p.listingId] ?? '').trim();
        if (!sku) continue;
        await saveSku(p.listingId, sku);
      }
      catalog.refresh();
      setSaved(true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Eşleştirme kaydedilmedi.');
    } finally {
      setBusy(false);
    }
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
          <Text style={styles.sub}>POST /v1/mappings · ilan → ana SKU. Öneri motoru yok.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {catalog.products.length === 0 ? (
          <EmptyState
            title="Önce içeri al"
            body="GET /v1/products senkten önce boş. Eşleştirme ilan ister."
            primary="İçeri al"
            onPrimary={() => router.push('/(tabs)/icerik-al')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.k02}>
              K02: pazaryeri adedi fiziksel stok değildir. Eşleşmeyince mapped false, satılabilir 0.
            </Text>
            {mapError ? <ConfigBanner text={mapError} /> : null}
            {formError ? <ConfigBanner text={formError} /> : null}
            {catalog.products.map((p) => (
              <View key={p.listingId} style={styles.card}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.meta}>
                  listingId {p.listingId} · pazar {p.marketplaceStock} · {p.mapped ? `SKU ${p.sku}` : 'eşleşmedi'}
                </Text>
                <TextField
                  label="Ana SKU"
                  value={draft[p.listingId] ?? ''}
                  onChangeText={(text) => {
                    setSaved(false);
                    setDraft((prev) => ({ ...prev, [p.listingId]: text }));
                  }}
                  autoCapitalize="characters"
                  placeholder="MASTER-SKU"
                />
              </View>
            ))}
            {saved ? <Text style={styles.ok}>Nest’e yazıldı. Öneri üretilmedi.</Text> : null}
            <Button label="Eşleştirmeyi kaydet" onPress={() => void save()} loading={busy} />
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
