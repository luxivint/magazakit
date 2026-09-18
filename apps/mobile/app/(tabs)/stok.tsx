import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useCatalog } from '@/context/CatalogContext';
import { ApiError, adjustStock } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function StokScreen() {
  const catalog = useCatalog();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);
  const inflight = useRef<Set<string>>(new Set());

  const change = async (sku: string, delta: number) => {
    const lock = `${sku}:${delta}:${Date.now()}`;
    if (inflight.current.has(sku) || busySku) return;
    inflight.current.add(sku);
    setBusySku(sku);
    setError(null);
    try {
      const next = await adjustStock(sku, delta);
      setNote(`${sku}: fiziksel ${next.physicalStock} · satılabilir ${next.sellableStock}. Yerel kayıt ≠ kanal teyidi.`);
      catalog.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Stok hareketi tamamlanmış sayılmaz.');
    } finally {
      inflight.current.delete(sku);
      setBusySku(null);
      void lock;
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
          <Text style={styles.title}>Stok</Text>
          <Text style={styles.sub}>Fiziksel ≠ pazar. Yalnız eşli ana SKU.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {catalog.loading ? (
          <Text style={styles.pad}>Stok yükleniyor…</Text>
        ) : catalog.error ? (
          <ErrorState title="Stok yüklenemedi" body={catalog.error} onRetry={() => catalog.refresh()} />
        ) : catalog.products.length === 0 ? (
          <EmptyState
            title="Katalog boş"
            body="İçeri al, sonra eşleştir. Pazar adedi fiziksel sayılmaz."
            primary="İçeri al"
            onPrimary={() => router.push('/(tabs)/icerik-al')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            {error ? <ConfigBanner text={error} /> : null}
            {note ? <Text style={styles.note}>{note}</Text> : null}
            {catalog.products.map((p) => (
              <View key={p.listingId} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.name}>{p.name}</Text>
                  <ChannelBadge />
                </View>
                <Text style={styles.meta}>
                  {p.mapped ? `SKU ${p.sku}` : 'eşleşmedi'} · Fiz {p.physical} · Sat {p.sellable} · Pazar{' '}
                  {p.marketplaceStock}
                </Text>
                {p.mapped ? (
                  <View style={styles.actions}>
                    <Button
                      label="−1"
                      variant="ghost"
                      disabled={busySku === p.sku}
                      onPress={() => void change(p.sku, -1)}
                    />
                    <Button
                      label="+1"
                      variant="lime"
                      disabled={busySku === p.sku}
                      onPress={() => void change(p.sku, 1)}
                    />
                  </View>
                ) : (
                  <Text style={styles.warn}>Eşlemeden fiziksel stok yazılmaz.</Text>
                )}
              </View>
            ))}
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
  pad: { padding: space.xl, fontFamily: fonts.medium, color: colors.muted },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, marginRight: 8 },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  warn: { fontFamily: fonts.medium, fontSize: 12, color: colors.peachText },
  note: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
});
