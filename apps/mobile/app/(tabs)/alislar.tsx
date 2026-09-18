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
import {
  ApiError,
  createPurchaseOrder,
  createSupplier,
  fetchPurchaseOrders,
  fetchSupplier,
  fetchSuppliers,
  patchSupplier,
  type PurchaseOrderStub,
  type Supplier,
} from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function AlislarScreen() {
  const { idToken } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderStub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<Supplier | null>(null);
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
      const [supplierPage, orderPage] = await Promise.all([fetchSuppliers(), fetchPurchaseOrders()]);
      setSuppliers(supplierPage.items);
      setOrders(orderPage.items);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Alışlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    const value = name.trim();
    if (value.length < 2) {
      setBanner('Tedarikçi adı yaz.');
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      const saved = await createSupplier({ name: value, note: note.trim() || undefined });
      setName('');
      setNote('');
      setBanner(`${saved.name} kaydedildi. Cari hesap açılmaz.`);
      await load();
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Tedarikçi tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
    }
  };

  const select = async (id: string) => {
    setBusy(true);
    setBanner(null);
    try {
      const item = await fetchSupplier(id);
      setPicked(item);
      setNote(item.note ?? '');
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Tedarikçi okunamadı.');
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!picked) return;
    setBusy(true);
    setBanner(null);
    try {
      const saved = await patchSupplier(picked.id, { note: note.trim() || null });
      setPicked(saved);
      setBanner('Not kaydedildi.');
      await load();
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Not tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
    }
  };

  const addOrder = async () => {
    const supplierId = picked?.id ?? suppliers[0]?.id;
    if (!supplierId) {
      setBanner('Önce tedarikçi kaydet.');
      return;
    }
    const amount = Number(qty.replace(',', '.'));
    setBusy(true);
    setBanner(null);
    try {
      const saved = await createPurchaseOrder({
        supplierId,
        sku: sku.trim() || undefined,
        qty: Number.isFinite(amount) ? amount : undefined,
      });
      setSku('');
      setQty('');
      setBanner(`Taslak alış ${saved.qty} adet. Stok artmaz.`);
      await load();
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Alış emri tamamlanmış sayılmaz.');
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
          <Text style={styles.title}>Alışlar</Text>
          <Text style={styles.sub}>Tedarikçi ve taslak emir. Stok şişmez.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error ? (
          <ErrorState title="Alışlar yüklenemedi" body={error} onRetry={() => void load()} />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            {banner ? <ConfigBanner text={banner} /> : null}
            <Text style={styles.section}>Tedarikçi</Text>
            <TextField label="Ad / unvan" value={name} onChangeText={setName} placeholder="Tedarikçi adı" />
            <TextField label="Not" value={note} onChangeText={setNote} placeholder="İsteğe bağlı" />
            <Button label="Kaydet" loading={busy} onPress={() => void create()} />
            {picked ? (
              <Button label="Notu güncelle" variant="ghost" loading={busy} onPress={() => void saveNote()} />
            ) : null}
            {suppliers.length === 0 ? (
              <Text style={styles.meta}>Tedarikçi yok. Boş liste hata değildir.</Text>
            ) : (
              suppliers.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.card, picked?.id === item.id && styles.cardOn]}
                  onPress={() => void select(item.id)}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.note ?? 'not yok'}</Text>
                </Pressable>
              ))
            )}
            <Text style={styles.section}>Alış emri (taslak)</Text>
            <TextField label="SKU" value={sku} onChangeText={setSku} placeholder="Ana SKU" />
            <TextField
              label="Adet"
              value={qty}
              onChangeText={setQty}
              placeholder="0"
              keyboardType="number-pad"
            />
            <Button label="Taslak oluştur" variant="ghost" loading={busy} onPress={() => void addOrder()} />
            {orders.length === 0 ? (
              <Text style={styles.meta}>Taslak yok. Onay stoğu artırmaz.</Text>
            ) : (
              orders.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.name}>{item.sku ?? 'SKU yok'}</Text>
                  <Text style={styles.meta}>
                    taslak · {item.qty} adet · stok artmaz
                  </Text>
                </View>
              ))
            )}
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
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 4,
  },
  cardOn: { borderColor: colors.graphite, borderWidth: 2 },
});
