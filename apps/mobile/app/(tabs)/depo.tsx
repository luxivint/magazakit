import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { ErrorState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { ApiError, createWarehouseTransfer, fetchWarehouses, type Warehouse } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function DepoScreen() {
  const { idToken } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [qty, setQty] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchWarehouses();
      setWarehouses(page.items);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Depo yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const transfer = async () => {
    const code = sku.trim();
    const amount = Number(qty.replace(',', '.'));
    if (!code || !Number.isFinite(amount) || amount <= 0) {
      setBanner('SKU ve adet gerekli.');
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const saved = await createWarehouseTransfer({ sku: code, qty: amount });
      setBanner(
        saved.stub
          ? `Stub transfer ${saved.qty} ${saved.sku}. Toplam stok artmaz.`
          : 'Transfer tamamlanmış sayılmaz.',
      );
      await load();
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Transfer tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
    }
  };

  const primary = warehouses.find((w) => w.isDefault) ?? warehouses[0];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Depo</Text>
          <Text style={styles.sub}>Tek depo varsayılan. WMS canlı değil.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error ? (
          <ErrorState title="Depo yüklenemedi" body={error} onRetry={() => void load()} />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            {banner ? <ConfigBanner text={banner} /> : null}
            {warehouses.map((wh) => (
              <View key={wh.id} style={styles.card}>
                <Text style={styles.name}>{wh.name}</Text>
                <Text style={styles.meta}>{wh.isDefault ? 'Varsayılan depo' : 'Hedef stub'}</Text>
              </View>
            ))}
            {!primary ? <Text style={styles.meta}>Depo yok.</Text> : null}
            <Text style={styles.section}>Transfer stub</Text>
            <TextField label="SKU" value={sku} onChangeText={setSku} placeholder="Ana SKU" />
            <TextField
              label="Adet"
              value={qty}
              onChangeText={setQty}
              placeholder="0"
              keyboardType="number-pad"
            />
            <Button label="Transfer iste" loading={busy} onPress={() => void transfer()} />
            <Text style={styles.meta}>Transfer toplam stok yaratmaz. Fiziksel hareket F3 defterinde.</Text>
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
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 8 },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 6,
  },
});
