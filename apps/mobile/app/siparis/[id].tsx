import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { createElement, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { TextField } from '@/components/ui/TextField';
import { useCatalog } from '@/context/CatalogContext';
import {
  ApiError,
  createOrderLabel,
  fetchOrderLabelPdf,
  newKey,
  reserveOrder,
  scanPackSku,
  type LabelResult,
  type OrderListItem,
} from '@/lib/apiClient';
import { colors, fonts, space } from '@/theme/tokens';

function LabelPdfFrame({ uri }: { uri: string }) {
  if (Platform.OS !== 'web') {
    return <Text style={styles.meta}>Kargo etiketi hazır. Yazdırınca kargolanmış sayılmaz.</Text>;
  }
  return createElement('iframe', {
    src: uri,
    title: 'Kargo etiketi PDF',
    style: {
      width: '100%',
      height: 200,
      border: '1px solid #E6E6E0',
      borderRadius: 12,
      background: '#fff',
    },
  });
}

export default function HazirlaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const order = catalog.orders.find((o) => o.id === id);
  const mappedSkus = useMemo(
    () => catalog.products.filter((p) => p.mapped).map((p) => p.sku),
    [catalog.products],
  );
  const barcodes = useMemo(
    () => catalog.products.filter((p) => p.mapped && p.barcode).map((p) => p.barcode),
    [catalog.products],
  );

  const [sku, setSku] = useState('');
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState<OrderListItem | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [label, setLabel] = useState<LabelResult | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [printNote, setPrintNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reserveKey = useRef<string | null>(null);
  const reserveLock = useRef(false);

  const reserved = !!(work?.reserved ?? order?.reserved);
  const packed = !!(work?.packed ?? order?.packed);
  const shipped = !!(work?.shipped ?? order?.shipped);

  const onReserve = async () => {
    if (!id || reserveLock.current || busy) return;
    reserveLock.current = true;
    setBusy(true);
    setError(null);
    setConflict(null);
    try {
      if (!reserveKey.current) {
        const key = newKey();
        reserveKey.current = key;
        const result = await reserveOrder(id, key);
        setWork(result);
        catalog.refresh();
      } else {
        await reserveOrder(id, newKey());
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setConflict(e.message);
      } else {
        setError(e instanceof ApiError ? e.message : 'Rezervasyon tamamlanmış sayılmaz.');
      }
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
      const result = await scanPackSku(id, value);
      setWork(result);
      if (result.packed) {
        const created = await createOrderLabel(id);
        setLabel(created);
        const blob = await fetchOrderLabelPdf(id);
        setPdfUri(URL.createObjectURL(blob));
      }
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
      const created = await createOrderLabel(id);
      setLabel(created);
      const blob = await fetchOrderLabelPdf(id);
      const uri = URL.createObjectURL(blob);
      setPdfUri(uri);
      setPrintNote(
        created.shipped
          ? 'Hata: yazdırma siparişi kargoda yapmamalı.'
          : 'Etiket yazdırıldı. Sipariş kargoda değil.',
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yazdırma kargolandı sayılmaz.');
    } finally {
      setBusy(false);
    }
  };

  const scanHint = [...mappedSkus.slice(0, 2), ...barcodes.slice(0, 1)].filter(Boolean).join(', ');

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.kicker}>Sipariş</Text>
        <Text style={styles.title}>{order?.number ?? 'Sipariş'}</Text>
        <Text style={styles.lead}>
          {order ? `${order.customer} · ${order.qty} adet` : 'Katalogda yok — içeri al.'}
          {shipped ? ' · kargoda' : reserved ? ' · rezerve' : ''}
        </Text>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          {error ? <ConfigBanner text={error} /> : null}
          {conflict ? <ConfigBanner text={conflict} /> : null}

          {order ? (
            <>
              <View style={styles.summary}>
                {order.lines.length ? (
                  order.lines.map((line) => (
                    <View key={`${line.listingId}-${line.qty}`} style={styles.lineRow}>
                      <ProductThumb
                        kind={order.thumb}
                        uri={line.imageUrl ?? order.imageUrl}
                        size={44}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lineTitle}>{line.title || line.listingId}</Text>
                        <Text style={styles.body}>{line.qty} adet</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.body}>{order.product}</Text>
                )}
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{order.statusLabel}</Text>
                  <Text style={styles.meta}>{order.due}</Text>
                </View>
              </View>
            </>
          ) : null}

          <Text style={styles.section}>1. Rezerve</Text>
          <Text style={styles.body}>
            Satılabilir stok, fiziksel eksi rezervedir. Eşleşmeyen ürün rezerve edilemez ve kargolanamaz.
          </Text>
          <Button
            label="Stoğu rezerve et"
            loading={busy && !packed}
            onPress={() => void onReserve()}
          />

          <Text style={styles.section}>2. Barkod / SKU</Text>
          <Text style={styles.body}>
            Kamerayla oku; web’de yaz. {scanHint ? `Örnek: ${scanHint}` : 'Önce ürünü eşleştir.'}
          </Text>
          <TextField
            label="SKU veya barkod"
            value={sku}
            onChangeText={setSku}
            autoCapitalize="characters"
            placeholder="SKU veya barkod"
          />
          <Button
            label={packed ? 'Paket tamam' : 'Tara ve eşle'}
            icon="barcode-outline"
            variant="lime"
            disabled={!reserved || packed}
            loading={busy && reserved && !packed}
            onPress={() => void onScan()}
          />

          <Text style={styles.section}>3. Kargo etiketi</Text>
          <Text style={styles.body}>Etiketi yazdırmak siparişi kargoda yapmaz.</Text>
          {pdfUri ? <LabelPdfFrame uri={pdfUri} /> : null}
          {label && !pdfUri ? <Text style={styles.meta}>Etiket hazır.</Text> : null}
          {printNote ? <Text style={styles.ok}>{printNote}</Text> : null}
          <Button
            label="Etiketi yazdır"
            icon="print-outline"
            disabled={!packed && !label}
            loading={busy && packed}
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
  summary: { gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E6E6E0' },
  lineRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  lineTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
