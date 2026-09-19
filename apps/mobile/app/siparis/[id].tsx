import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { createElement, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { TextField } from '@/components/ui/TextField';
import { useCatalog } from '@/context/CatalogContext';
import type { Order, OrderLineView, Product } from '@/data/mock';
import {
  ApiError,
  createEinvoice,
  createOrderLabel,
  fetchOperations,
  fetchOrderLabelPdf,
  newKey,
  reserveOrder,
  scanPackSku,
  type LabelResult,
  type OperationItem,
  type OrderListItem,
} from '@/lib/apiClient';
import { formatMoney } from '@/lib/money';
import { colors, fonts, radii, space } from '@/theme/tokens';

const TABS = [
  { key: 'overview', label: 'Genel bakış' },
  { key: 'history', label: 'İşlem geçmişi' },
] as const;

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

function copyText(value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }
  return Promise.resolve();
}

function knownFee(source?: string | null): boolean {
  return source === 'fatura' || source === 'fatura-tahsis' || source === 'settlement';
}

function tariffFee(source?: string | null): boolean {
  return source === 'tarife';
}

function statusChip(order: Order): { label: string; tone: 'ok' | 'warn' | 'idle' } {
  if (order.status === 'tamamlandi') return { label: 'Teslim edildi', tone: 'ok' };
  if (order.status === 'kargoda') return { label: 'Kargoda', tone: 'warn' };
  if (order.status === 'iade') return { label: 'İade', tone: 'idle' };
  return { label: order.statusLabel || 'Hazırlanacak', tone: 'idle' };
}

function dateLine(order: Order): string {
  const day = new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  if (order.status === 'tamamlandi') return `${day} tarihinde teslim edildi.`;
  if (order.status === 'kargoda') return `${day} tarihinde kargoya verildi.`;
  if (order.status === 'iade') return `${day} · iade / iptal.`;
  return order.due || `${day} tarihinde alındı.`;
}

function packSubtitle(line: OrderLineView, product?: Product): string {
  const hay = `${line.title ?? ''} ${product?.name ?? ''}`;
  const packed = hay.match(/(\d+)\s*adet/i);
  const color = hay.match(/\b(siyah|beyaz|şeffaf|seffaf|gri|mavi|kırmızı|kirmizi|yeşil|yesil)\b/i);
  const pack = packed ? `${packed[1]} adet / paket` : null;
  if (color && pack) {
    const c = color[1].replace('seffaf', 'şeffaf').replace('kirmizi', 'kırmızı').replace('yesil', 'yeşil');
    return `${c[0].toLocaleUpperCase('tr-TR')}${c.slice(1)} · ${pack}`;
  }
  if (pack) return pack;
  if (product?.sku) return product.sku;
  return 'Paket';
}

function carrierLabel(name: string | null | undefined): string {
  if (!name) return 'Kargo';
  return /kargo/i.test(name) ? name : `${name} Kargo`;
}

function extraCuts(money: NonNullable<Order['money']>): { label: string; value: number }[] {
  const rows: { label: string; value: number }[] = [];
  const add = (label: string, value?: number | null) => {
    if (value && value !== 0) rows.push({ label, value: -Math.abs(value) });
  };
  add('Mağaza hizmet bedeli', money.storeFeeTry);
  add('Stopaj', money.stoppageTry);
  add('SGR', money.sgrFeeTry);
  add('İptal', money.cancelTry);
  add('İade', money.returnTry);
  add('İade kargo', money.returnCargoTry);
  add('Ceza', money.penaltyTry);
  return rows;
}

function cargoMoves(order: Order): { title: string; detail: string }[] {
  const placed = new Date(order.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const moves = [{ title: 'Sipariş alındı', detail: placed }];
  if (order.status === 'kargoda' || order.status === 'tamamlandi') {
    moves.push({
      title: 'Kargoya verildi',
      detail: order.money?.cargoTrackingNumber ?? carrierLabel(order.money?.cargoProvider),
    });
  }
  if (order.status === 'tamamlandi') {
    moves.push({ title: 'Teslim edildi', detail: dateLine(order) });
  }
  if (order.status === 'iade') {
    moves.push({ title: 'İade / iptal', detail: placed });
  }
  return moves;
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

  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('overview');
  const [sku, setSku] = useState('');
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState<OrderListItem | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [label, setLabel] = useState<LabelResult | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [printNote, setPrintNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCuts, setShowCuts] = useState(false);
  const [showMoves, setShowMoves] = useState(false);
  const [ops, setOps] = useState<OperationItem[] | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const reserveKey = useRef<string | null>(null);
  const reserveLock = useRef(false);

  const reserved = !!(work?.reserved ?? order?.reserved);
  const packed = !!(work?.packed ?? order?.packed);
  const money = order?.money;
  const chip = order ? statusChip(order) : null;

  const loadOps = async () => {
    setOpsLoading(true);
    setOpsError(null);
    try {
      const page = await fetchOperations();
      const needle = (order?.number ?? id ?? '').replace('#', '').toLowerCase();
      setOps(
        page.items.filter((item) => {
          if (item.refId && (item.refId === id || item.refId === order?.id)) return true;
          const hay = `${item.title} ${item.type} ${item.refId ?? ''}`.toLowerCase();
          return needle ? hay.includes(needle) : false;
        }),
      );
    } catch (e) {
      setOpsError(e instanceof ApiError ? e.message : 'İşlem geçmişi yüklenemedi.');
      setOps([]);
    } finally {
      setOpsLoading(false);
    }
  };

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

  const onCopy = async () => {
    if (!order) return;
    await copyText(order.number.replace(/^#/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onInvoice = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      await createEinvoice(order.id);
      router.push('/(tabs)/e-fatura');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Fatura taslağı açılamadı.');
      router.push('/(tabs)/e-fatura');
    } finally {
      setBusy(false);
    }
  };

  const scanHint = [...mappedSkus.slice(0, 2), ...barcodes.slice(0, 1)].filter(Boolean).join(', ');

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <View style={styles.nav}>
          <Pressable style={styles.navBtn} onPress={() => router.back()} accessibilityLabel="Geri">
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <Text style={styles.navTitle}>Sipariş detayı</Text>
          <Pressable style={styles.navBtn} onPress={() => router.push('/(tabs)/yardim')} accessibilityLabel="Daha fazla">
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.white} />
          </Pressable>
        </View>

        {order ? (
          <>
            <View style={styles.brandRow}>
              <View style={styles.tyChip}>
                <Text style={styles.tyChipText}>{order.channelLabel.toLocaleLowerCase('tr-TR')}</Text>
              </View>
              <Text style={styles.brandSep}>|</Text>
              <Text style={styles.brandKind}>Sipariş</Text>
            </View>
            <View style={styles.numberRow}>
              <Text style={styles.number}>{order.number}</Text>
              <Pressable onPress={() => void onCopy()} accessibilityLabel="Sipariş numarasını kopyala" hitSlop={8}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.mutedOnDark} />
              </Pressable>
            </View>
            <View style={styles.leadRow}>
              <Text style={styles.lead}>
                {order.customer} · {order.qty} adet
              </Text>
              {chip ? (
                <View style={[styles.statusPill, chip.tone === 'ok' && styles.statusOk, chip.tone === 'warn' && styles.statusWarn]}>
                  {chip.tone === 'ok' ? <Ionicons name="checkmark-circle" size={14} color="#166534" /> : null}
                  <Text style={[styles.statusText, chip.tone === 'ok' && styles.statusOkText]}>{chip.label}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.dateLine}>{dateLine(order)}</Text>
          </>
        ) : (
          <Text style={styles.dateLine}>Katalogda yok.</Text>
        )}
      </SafeAreaView>

      <PorcelainSheet>
        <View style={styles.tabBar}>
          {TABS.map((item) => {
            const on = item.key === tab;
            return (
              <Pressable
                key={item.key}
                style={styles.tab}
                onPress={() => {
                  setTab(item.key);
                  if (item.key === 'history' && ops == null) void loadOps();
                }}>
                <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{item.label}</Text>
                <View style={[styles.tabLine, on && styles.tabLineOn]} />
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          {error ? <ConfigBanner text={error} /> : null}
          {conflict ? <ConfigBanner text={conflict} /> : null}

          {!order ? (
            <EmptyState title="Sipariş yok" body="Bu kayıt katalogda görünmüyor." />
          ) : tab === 'history' ? (
            <HistoryPane
              loading={opsLoading}
              error={opsError}
              items={ops ?? []}
              onRetry={() => void loadOps()}
            />
          ) : (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.section}>Ürünler</Text>
                <Text style={styles.sectionMeta}>{order.lines.length || 1} kalem</Text>
              </View>
              <View style={styles.card}>
                {(order.lines.length ? order.lines : [{ listingId: order.id, qty: order.qty, title: order.product, imageUrl: order.imageUrl, unitPriceTry: order.amount }]).map(
                  (line, i) => {
                    const product = catalog.products.find(
                      (p) =>
                        p.id === line.listingId ||
                        p.listingId === line.listingId ||
                        p.sku === line.listingId,
                    );
                    const unit = line.unitPriceTry;
                    const total = unit != null ? unit * line.qty : i === 0 && !order.lines.length ? order.amount : null;
                    return (
                      <Pressable
                        key={`${line.listingId}-${i}`}
                        style={[styles.productRow, i > 0 && styles.productSplit]}
                        onPress={() => product && router.push(`/urun/${product.id}`)}>
                        <ProductThumb kind={order.thumb} uri={line.imageUrl ?? order.imageUrl} size={64} />
                        <View style={styles.productCopy}>
                          <Text style={styles.productTitle} numberOfLines={2}>
                            {line.title || order.product}
                          </Text>
                          <Text style={styles.productPack}>{packSubtitle(line, product)}</Text>
                          <Text style={styles.productQty}>
                            {line.qty} × {unit != null ? formatMoney(unit) : '—'}
                          </Text>
                        </View>
                        <Text style={styles.productTotal}>{total != null ? formatMoney(total) : '—'}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                      </Pressable>
                    );
                  },
                )}
              </View>

              <Text style={styles.section}>Ödeme özeti</Text>
              <PayoutCard money={money} amount={order.amount} showCuts={showCuts} onToggleCuts={() => setShowCuts((v) => !v)} />

              <Text style={styles.section}>Teslimat</Text>
              <View style={styles.card}>
                <View style={styles.shipRow}>
                  <View style={styles.shipIcon}>
                    <Ionicons name="car-outline" size={18} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.shipTitleRow}>
                      <Text style={styles.shipTitle}>{carrierLabel(money?.cargoProvider)}</Text>
                      {chip?.tone === 'ok' ? (
                        <View style={[styles.statusPill, styles.statusOk, { paddingVertical: 2 }]}>
                          <Ionicons name="checkmark-circle" size={12} color="#166534" />
                          <Text style={[styles.statusText, styles.statusOkText]}>Teslim edildi</Text>
                        </View>
                      ) : (
                        <Text style={styles.meta}>{chip?.label}</Text>
                      )}
                    </View>
                    <Text style={styles.shipMeta}>
                      {money?.cargoTrackingNumber ?? 'Takip no yok'}
                      {money?.cargoDeci != null ? ` · ${money.cargoDeci} desi` : ''}
                    </Text>
                  </View>
                </View>
                <Pressable style={styles.movesBtn} onPress={() => setShowMoves((v) => !v)}>
                  <Text style={styles.movesBtnText}>Kargo hareketleri</Text>
                  <Ionicons name={showMoves ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.ink} />
                </Pressable>
                {showMoves
                  ? cargoMoves(order).map((move) => (
                      <View key={move.title} style={styles.moveRow}>
                        <Text style={styles.moveTitle}>{move.title}</Text>
                        <Text style={styles.moveDetail}>{move.detail}</Text>
                      </View>
                    ))
                  : null}
              </View>

              {needsPrepare ? (
                <>
                  <Text style={styles.section}>Hazırla</Text>
                  <Text style={styles.body}>Satılabilir stok, fiziksel eksi rezervedir.</Text>
                  <Button label="Stoğu rezerve et" loading={busy && !packed} onPress={() => void onReserve()} />
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
              ) : null}

              <View style={styles.footerRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Faturayı görüntüle"
                    icon="document-text-outline"
                    loading={busy}
                    onPress={() => void onInvoice()}
                  />
                </View>
                <Pressable style={styles.chatBtn} onPress={() => router.push('/(tabs)/yardim')} accessibilityLabel="Destek">
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.ink} />
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

function HistoryPane({
  loading,
  error,
  items,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  items: OperationItem[];
  onRetry: () => void;
}) {
  if (loading) return <Text style={styles.body}>İşlemler yükleniyor…</Text>;
  if (error) return <ConfigBanner text={error} />;
  if (!items.length) {
    return <EmptyState title="İşlem yok" body="Bu siparişe bağlı hareket henüz düşmedi." primary="Yenile" onPrimary={onRetry} />;
  }
  return (
    <View style={styles.card}>
      {items.map((item) => (
        <View key={item.id} style={styles.moveRow}>
          <Text style={styles.moveTitle}>{item.title || item.type}</Text>
          <Text style={styles.moveDetail}>{item.status}</Text>
        </View>
      ))}
    </View>
  );
}

function signedMoney(value: number | null | undefined): string | null {
  if (value == null) return null;
  const n = -Math.abs(value);
  return formatMoney(n);
}

function PayoutCard({
  money,
  amount,
  showCuts,
  onToggleCuts,
}: {
  money: Order['money'];
  amount: number;
  showCuts: boolean;
  onToggleCuts: () => void;
}) {
  const cargoKnown = knownFee(money?.cargoFeeSource);
  const phbKnown = knownFee(money?.serviceFeeSource);
  const phbTariff = tariffFee(money?.serviceFeeSource) || (!phbKnown && money?.serviceFeeTry != null);
  const extras = money ? extraCuts(money) : [];
  const bannerBits: string[] = [];
  if (!cargoKnown) bannerBits.push('Kargo bedeli eksik.');
  if (phbTariff) bannerBits.push('Hizmet bedeli tahmini.');
  else if (!phbKnown && money?.serviceFeeTry == null) bannerBits.push('Hizmet bedeli bekleniyor.');

  const tutar = money?.customerTry ?? amount;
  const discount = (money?.sellerDiscountTry ?? 0) + (money?.tyDiscountTry ?? 0);

  return (
    <View style={styles.card}>
      <MoneyLine label="Sipariş tutarı" value={formatMoney(tutar)} />
      <MoneyLine label="Komisyon" value={signedMoney(money?.commissionTry) ?? '—'} muted />
      <MoneyLine label="İndirim" value={discount > 0 ? signedMoney(discount) ?? '—' : formatMoney(0)} muted />
      <MoneyLine
        label="Platform hizmet bedeli"
        badge={phbTariff ? 'Tahmini' : null}
        value={signedMoney(money?.serviceFeeTry) ?? '—'}
        muted
      />
      <MoneyLine
        label="Kargo bedeli"
        value={cargoKnown ? signedMoney(money?.cargoFeeTry) ?? '—' : 'Bekleniyor'}
        pending={!cargoKnown}
        muted={cargoKnown}
      />
      <View style={styles.netRow}>
        <Text style={styles.netLabel}>Net hakediş</Text>
        {cargoKnown && money?.estimatedEarningsTry != null ? (
          <Text style={styles.netValue}>{formatMoney(money.estimatedEarningsTry)}</Text>
        ) : (
          <Text style={styles.netPending}>Hesaplanıyor</Text>
        )}
      </View>
      {bannerBits.length ? (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={16} color="#C47A1A" />
          <Text style={styles.infoBannerText}>{bannerBits.join(' ')}</Text>
        </View>
      ) : null}
      {showCuts && extras.length
        ? extras.map((row) => <MoneyLine key={row.label} label={row.label} value={formatMoney(row.value)} muted />)
        : null}
      <Pressable style={styles.cutsLink} onPress={onToggleCuts}>
        <Text style={styles.cutsLinkText}>Tüm kesintileri gör</Text>
        <Ionicons name={showCuts ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function MoneyLine({
  label,
  value,
  muted,
  pending,
  badge,
}: {
  label: string;
  value: string;
  muted?: boolean;
  pending?: boolean;
  badge?: string | null;
}) {
  return (
    <View style={styles.moneyRow}>
      <View style={styles.moneyLabelWrap}>
        <Text style={styles.moneyLabel}>{label}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.moneyValue, muted && styles.moneyMuted, pending && styles.moneyPending]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite, paddingHorizontal: space.xl, paddingBottom: 18 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tyChip: {
    backgroundColor: colors.trendyol,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tyChipText: { fontFamily: fonts.bold, fontSize: 11, color: colors.white, letterSpacing: 0.2 },
  brandSep: { color: '#5A5E5A', fontSize: 12 },
  brandKind: { fontFamily: fonts.medium, fontSize: 13, color: colors.mutedOnDark },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  number: { fontFamily: fonts.extraBold, fontSize: 28, color: colors.white, letterSpacing: -0.6 },
  leadRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  lead: { fontFamily: fonts.medium, fontSize: 14, color: '#D7DAD4' },
  dateLine: { marginTop: 6, fontFamily: fonts.regular, fontSize: 13, color: colors.mutedOnDark },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#2A2E2C',
  },
  statusOk: { backgroundColor: '#C8F0C0' },
  statusWarn: { backgroundColor: '#3A3224' },
  statusText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.white },
  statusOkText: { color: '#166534' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: space.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.sheetLine,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 14 },
  tabLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.muted },
  tabLabelOn: { fontFamily: fonts.bold, color: colors.ink },
  tabLine: { marginTop: 10, height: 2, alignSelf: 'stretch', backgroundColor: 'transparent' },
  tabLineOn: { backgroundColor: colors.ink },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 48 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 8 },
  sectionMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productSplit: { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.sheetLine },
  productCopy: { flex: 1, gap: 2 },
  productTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  productPack: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  productQty: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  productTotal: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  ok: { fontFamily: fonts.medium, fontSize: 13, color: colors.success },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  moneyLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  moneyLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  moneyValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  moneyMuted: { color: colors.ink },
  moneyPending: { color: colors.trendyol, fontFamily: fonts.semibold },
  badge: {
    backgroundColor: '#FBE7C6',
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 10, color: '#9A6A20' },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.sheetLine,
  },
  netLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  netValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  netPending: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4D6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoBannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: '#8A5A12' },
  cutsLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  cutsLinkText: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  shipRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  shipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  shipTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, flex: 1 },
  shipMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  movesBtn: {
    marginTop: 4,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  movesBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  moveRow: { gap: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.sheetLine },
  moveTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  moveDetail: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  chatBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.4,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
