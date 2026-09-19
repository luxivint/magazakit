import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { DesiFields, parseDim, type DesiValues } from '@/components/catalog/DesiFields';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useCatalog } from '@/context/CatalogContext';
import { ApiError, createProduct } from '@/lib/apiClient';
import { colors, fonts, space } from '@/theme/tokens';

export default function UrunYeniScreen() {
  const catalog = useCatalog();
  const [title, setTitle] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [desi, setDesi] = useState<DesiValues>({ weightKg: '', widthCm: '', heightCm: '', lengthCm: '' });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onSave() {
    setBusy(true);
    setNote(null);
    try {
      const parsed = Number(price.replace(',', '.'));
      const created = await createProduct({
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
      router.replace(`/urun/${created.id}`);
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Ürün kaydı tamamlanmış sayılmaz.');
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
        <Text style={styles.title}>Ürün gir</Text>
        <Text style={styles.lead}>Desi kataloğa yazılır. Trendyol’a canlı yazım yok.</Text>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet}>
          <TextField label="Başlık" value={title} onChangeText={setTitle} autoCapitalize="sentences" />
          <TextField label="SKU" value={sku} onChangeText={setSku} />
          <TextField label="Barkod" value={barcode} onChangeText={setBarcode} />
          <TextField label="Fiyat (TL)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Text style={styles.section}>Desi</Text>
          <DesiFields values={desi} onChange={setDesi} />
          {note ? <Text style={styles.err}>{note}</Text> : null}
          <Button label="Kaydet" loading={busy} onPress={() => void onSave()} />
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
