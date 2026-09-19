import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { DesiFields, parseDim, type DesiValues } from '@/components/catalog/DesiFields';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useCatalog } from '@/context/CatalogContext';
import { ApiError, updateProduct } from '@/lib/apiClient';
import { colors, fonts, space } from '@/theme/tokens';

export default function UrunDuzenleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const product = catalog.products.find((p) => p.id === id);
  const initial = useMemo<DesiValues>(
    () => ({
      weightKg: product?.weightKg != null ? String(product.weightKg) : '',
      widthCm: product?.widthCm != null ? String(product.widthCm) : '',
      heightCm: product?.heightCm != null ? String(product.heightCm) : '',
      lengthCm: product?.lengthCm != null ? String(product.lengthCm) : '',
    }),
    [product],
  );
  const [title, setTitle] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [desi, setDesi] = useState<DesiValues>(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onSave() {
    if (!id) return;
    setBusy(true);
    setNote(null);
    try {
      const parsed = Number(price.replace(',', '.'));
      await updateProduct(id, {
        title: title.trim() || undefined,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        priceTry: Number.isFinite(parsed) ? parsed : undefined,
        weightKg: parseDim(desi.weightKg),
        widthCm: parseDim(desi.widthCm),
        heightCm: parseDim(desi.heightCm),
        lengthCm: parseDim(desi.lengthCm),
      });
      catalog.refresh();
      router.replace(`/urun/${id}`);
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Kayıt tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.kicker}>Katalog</Text>
        <Text style={styles.title}>Ürünü düzenle</Text>
        <Text style={styles.lead}>{product?.name ?? 'Ürün bulunamadı'}</Text>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet}>
          {product ? (
            <>
              <TextField label="Başlık" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
              <TextField label="SKU" value={sku} onChangeText={setSku} />
              <TextField label="Barkod" value={barcode} onChangeText={setBarcode} />
              <TextField label="Fiyat (TL)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              <Text style={styles.section}>Desi</Text>
              <DesiFields values={desi} onChange={setDesi} />
              {note ? <Text style={styles.err}>{note}</Text> : null}
              <Button label="Kaydet" loading={busy} onPress={() => void onSave()} />
            </>
          ) : (
            <Text style={styles.err}>Katalogda bu ilan yok.</Text>
          )}
        </ScrollView>
      </PorcelainSheet>
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
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 8 },
  err: { fontFamily: fonts.medium, fontSize: 13, color: '#C45C4A' },
});
