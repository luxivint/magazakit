import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { createElement, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { MoneyText } from '@/components/ui/MoneyText';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { TextField } from '@/components/ui/TextField';
import { useCatalog } from '@/context/CatalogContext';
import type { Order } from '@/data/mock';
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
import { formatMoney } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

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

function leadSuffix(order: { status: string; reserved?: boolean }): string {
  if (order.status === 'tamamlandi') return ' · teslim edildi';
  if (order.status === 'kargoda') return ' · kargoda';
  if (order.status === 'iade') return ' · iade';
  if (order.reserved) return ' · rezerve';
  return '';
}

export default function SiparisDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalog = useCatalog();
  const order = catalog.orders.find((o) => o.id === id);
  const needsPrepare = order?.status === 'hazirlanacak';
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
  const money = order?.money;
  const hero = order?.imageUrl ?? order?.lines.find((l) => l.imageUrl)?.imageUrl ?? null;
  const placed = order
    ? new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    : '';

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
  const closedNote =
    order?.status === 'tamamlandi'
      ? 'Bu paket teslim edildi. Hazırlama adımları kapalı.'
      : order?.status === 'kargoda'
        ? 'Bu paket kargoda. Hazırlama adımları yalnızca bekleyen siparişlerde açılır.'
        : 'Bu paket kapalı. Hazırlama adımları yalnızca bekleyen siparişlerde açılır.';

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.kicker}>{order?.statusLabel ?? 'Sipariş'}</Text>
        <Text style={styles.title}>{order?.number ?? 'Sipariş'}</Text>
        <Text style={styles.lead}>
          {order ? `${order.customer} · ${order.qty} adet${leadSuffix(order)}` : 'Katalogda yok — içeri al.'}
        </Text>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          {error ? <ConfigBanner text={error} /> : null}
          {conflict ? <ConfigBanner text={conflict} /> : null}

          {order ? (
            <>
              <View style={styles.summary}>
                {hero ? (
                  <Image source={{ uri: hero }} style={styles.heroImg} accessibilityLabel={order.product} />
                ) : (
                  <View style={styles.heroPlaceholder}>
                    <ProductThumb kind={order.thumb} size={72} />
                    <Text style={styles.body}>Ürün görseli katalogda yok. İçeri al ile ürünleri yenile.</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <ChannelBadge channel={order.channel} />
                  <Text style={styles.meta}>{order.due}</Text>
                </View>
                {order.lines.length ? (
                  order.lines.map((line, i) => (
                    <View key={`${line.listingId}-${line.qty}-${i}`} style={styles.lineRow}>
                      <ProductThumb
                        kind={order.thumb}
                        uri={line.imageUrl ?? order.imageUrl}
                        size={56}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lineTitle}>{line.title || order.product}</Text>
                        <Text style={styles.body}>
                          {line.qty} adet
                          {line.unitPriceTry != null ? ` · ${formatMoney(line.unitPriceTry)}` : ''}
                          {line.commissionRate != null ? ` · kom. %${line.commissionRate}` : ''}
                        </Text>
                        <Text style={styles.body}>Teslim {placed}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.body}>{order.product}</Text>
                )}
              </View>

              <PayoutCard money={money} />
            </>
          ) : null}

          {needsPrepare ? (
            <>
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
            </>
          ) : order ? (
            <Text style={styles.note}>{closedNote}</Text>
          ) : null}
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

function signed(value: number | null | undefined): number | null {
  if (value == null) return null;
  return -Math.abs(value);
}

function sourceLabel(source?: string, label?: string | null): string {
  if (source === 'fatura') return 'fatura';
  if (source === 'fatura-tahsis') return 'fatura-tahsis';
  if (source === 'settlement') return 'cari';
  if (source === 'tarife') return label || 'tahmini (tarife)';
  return 'yok';
}

function PayoutCard({ money }: { money: Order['money'] }) {
  if (!money) {
    return (
      <Text style={styles.note}>Kazanç kalemleri bu kayıtta yok. İçeri al ile siparişi yeniden çek.</Text>
    );
  }
  const cargoLabel =
    money.cargoFeeRate != null ? `Kargo (%${money.cargoFeeRate})` : 'Kargo';
  const netReady = money.estimatedEarningsTry != null && money.cargoFeeTry != null && money.serviceFeeTry != null;
  const status = money.earningsStatus ?? (money.earningsEstimated === false ? 'kesinleşti' : netReady ? 'tahmini' : 'eksik');
  const netCaption = status === 'kesinleşti' ? 'kesinleşti' : status === 'tahmini' ? 'tahmini' : 'eksik';
  return (
    <>
      <Text style={styles.section}>Kesinti (panel)</Text>
      <View style={styles.moneyCard}>
        <MoneyRow label="Sipariş tutarı" value={money.customerTry} />
        <MoneyRow label="Komisyon" value={signed(money.commissionTry)} muted />
        <MoneyRow
          label={`${cargoLabel} · ${sourceLabel(money.cargoFeeSource, money.cargoFeeLabel)}`}
          value={signed(money.cargoFeeTry)}
          muted
        />
        <MoneyRow label="İndirim" value={-(money.sellerDiscountTry || 0)} muted />
        <MoneyRow label="Ceza" value={-(money.penaltyTry || 0)} muted />
        <MoneyRow label="İptal" value={-(money.cancelTry || 0)} muted />
        <MoneyRow label="İade" value={-(money.returnTry || 0)} muted />
        <MoneyRow label="İade kargo" value={-(money.returnCargoTry || 0)} muted />
        <MoneyRow label="Yurtdışı operasyon iade" value={-(money.intlReturnOpTry || 0)} muted />
        <MoneyRow label="Uluslararası hizmet bedeli" value={-(money.intlServiceTry || 0)} muted />
        <MoneyRow
          label={`Platform hizmet bedeli · ${sourceLabel(money.serviceFeeSource)}`}
          value={signed(money.serviceFeeTry)}
          muted
        />
        <MoneyRow label="Stopaj" value={-(money.stoppageTry ?? 0)} muted />
        <MoneyRow label="SGR" value={-(money.sgrFeeTry || 0)} muted />
        <View style={styles.earnRow}>
          <Text style={styles.earnLabel}>Net hakediş · {netCaption}</Text>
          {netReady ? (
            <MoneyText value={money.estimatedEarningsTry ?? 0} size="metric" />
          ) : (
            <Text style={styles.missing}>kalem eksik</Text>
          )}
        </View>
        {money.paymentMethod ? (
          <Text style={styles.body}>Ödeme: {money.paymentMethod}</Text>
        ) : null}
        {money.cargoProvider ? (
          <Text style={styles.body}>
            {money.cargoProvider}
            {money.cargoTrackingNumber ? ` · ${money.cargoTrackingNumber}` : ''}
            {money.cargoDeci != null ? ` · ${money.cargoDeci} desi` : ''}
          </Text>
        ) : null}
        <Text style={styles.note}>
          Panel formülü: tutar − komisyon − kargo − PHB. Örnek (kaynaklı): 115 − 18,40 − 57,99 − 13,19 = 25,42.
          57,99 ancak kargo faturası satırında veya senin tarife tablonda durur; koda gömülmez. PHB faturası
          sipariş numarası taşımıyorsa dönem tahsisi yalnız n=1 veya n × senin PHB tutarın faturaya denkse.
        </Text>
      </View>
    </>
  );
}

function MoneyRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: number | null;
  muted?: boolean;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={styles.label}>{label}</Text>
      {value == null ? (
        <Text style={styles.missing}>yok</Text>
      ) : (
        <Text style={[styles.value, muted && { color: colors.muted }]}>{formatMoney(value)}</Text>
      )}
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
  heroImg: { width: '100%', height: 180, borderRadius: radii.card, backgroundColor: colors.skeleton },
  heroPlaceholder: {
    minHeight: 120,
    borderRadius: radii.card,
    backgroundColor: colors.porcelainCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  lineRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  lineTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moneyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  value: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  missing: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  earnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.sheetLine,
  },
  earnLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 17 },
});
