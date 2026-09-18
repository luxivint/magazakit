import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { TextField } from '@/components/ui/TextField';
import { useCatalog } from '@/context/CatalogContext';
import {
  ApiError,
  fetchOrderLabel,
  printOrderLabel,
  reserveOrder,
  scanOrderSku,
  type LabelPreview,
} from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function HazirlaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const order = catalog.orders.find((o) => o.id === id);
  const mappedSkus = useMemo(
    () => catalog.products.filter((p) => p.mapped).map((p) => p.sku),
    [catalog.products],
  );

  const [sku, setSku] = useState('');
  const [busy, setBusy] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [already, setAlready] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [label, setLabel] = useState<LabelPreview | null>(null);
  const [printNote, setPrintNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reserveLock = useRef(false);

  const onReserve = async () => {
    if (!id || reserveLock.current || busy) return;
    reserveLock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await reserveOrder(id);
      setReserved(true);
      setAlready(!!result.alreadyReserved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Rezervasyon tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
      reserveLock.current = false;
    }
  };

  const onScan = async () => {
    if (!id || busy) return;
    const value = sku.trim();
    if (!value) {
      setError('SKU veya barkod gir.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await scanOrderSku(id, value);
      if (!result.matched) {
        setError('Yanlış barkod / SKU. Sipariş paketlenmedi.');
        return;
      }
      setScanned(true);
      const next = await fetchOrderLabel(id);
      setLabel(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Tarama tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
    }
  };

  const onPrint = async () => {
    if (!id || busy) return;
    setBusy(true);
    setError(null);
    try {
      const printed = await printOrderLabel(id);
      setPrintNote(
        printed.shipped === true
          ? 'Hata: yazdırma kargolandı yapmamalı.'
          : 'Etiket yazdırıldı. Sipariş kargolandı değil.',
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yazdırma kargolandı sayılmaz.');
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
        <Text style={styles.kicker}>E-12 · paket ≠ sipariş</Text>
        <Text style={styles.title}>{order?.number ?? 'Sipariş'}</Text>
        <Text style={styles.lead}>{order ? `${order.customer} · ${order.qty} adet` : 'Katalogda yok — içeri al.'}</Text>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          {error ? <ConfigBanner text={error} /> : null}
          {already ? <Text style={styles.ok}>Nest 409: ikinci rezervasyon yok, paketlemeye devam.</Text> : null}

          <Text style={styles.section}>1. Rezerve</Text>
          <Text style={styles.body}>Çift dokunuş tek rezervasyon. T07 Nest 409.</Text>
          <Button
            label={reserved ? 'Rezerve edildi' : 'Stoğu rezerve et'}
            loading={busy && !reserved}
            disabled={reserved}
            onPress={() => void onReserve()}
          />

          <Text style={styles.section}>2. Barkod / SKU</Text>
          <Text style={styles.body}>
            Kamera native; web’de klavye. Eşli SKU örnekleri: {mappedSkus.slice(0, 3).join(', ') || 'önce eşleştir'}
          </Text>
          <TextField
            label="SKU"
            value={sku}
            onChangeText={setSku}
            autoCapitalize="characters"
            placeholder="MASTER-SKU veya barkod"
          />
          <Button
            label="Tara ve eşle"
            icon="barcode-outline"
            variant="lime"
            disabled={!reserved}
            loading={busy && reserved && !scanned}
            onPress={() => void onScan()}
          />

          <Text style={styles.section}>3. Kargo etiketi</Text>
          <Text style={styles.body}>Yazdırmak kargolandı yapmaz (E-60). Demo barkod yok.</Text>
          {label?.imageUrl ? (
            <Image source={{ uri: label.imageUrl }} style={styles.labelImg} resizeMode="contain" />
          ) : label?.pdfUrl ? (
            <Text style={styles.meta}>PDF: {label.pdfUrl}</Text>
          ) : scanned ? (
            <Text style={styles.meta}>Etiket bekleniyor…</Text>
          ) : null}
          {printNote ? <Text style={styles.ok}>{printNote}</Text> : null}
          <Button
            label="Etiketi yazdır"
            icon="print-outline"
            disabled={!label}
            loading={busy && scanned}
            onPress={() => void onPrint()}
          />
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
  title: { marginTop: 6, fontFamily: fonts.bold, fontSize: 28, color: colors.white, letterSpacing: -0.5 },
  lead: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 8 },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  ok: { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
  labelImg: {
    width: '100%',
    height: 160,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
});
