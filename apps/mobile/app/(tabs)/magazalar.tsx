import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { ErrorState } from '@/components/ui/EmptyState';
import { PeachAlert } from '@/components/ui/PeachAlert';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/context/AuthContext';
import { useShops } from '@/context/ShopContext';
import { checkTrendyolTariff, fetchTrendyolTariff, saveTrendyolTariff, type TrendyolTariff } from '@/lib/apiClient';
import { shopStatusLabel } from '@/lib/mapCatalog';
import { colors, fonts, radii, space } from '@/theme/tokens';

function moneyInput(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function MagazalarScreen() {
  const { orgName } = useAuth();
  const { shops, loading, error, refresh } = useShops();
  const hasTrendyol = shops.some((s) => s.channel === 'trendyol');
  const [tariff, setTariff] = useState<TrendyolTariff | null>(null);
  const [table, setTable] = useState('1');
  const [carrier, setCarrier] = useState('Aras');
  const [phb, setPhb] = useState('10.99');
  const [sameDay, setSameDay] = useState('4.99');
  const [arasNet, setArasNet] = useState('48.33');
  const [tariffNote, setTariffNote] = useState<string | null>(null);
  const [tariffBusy, setTariffBusy] = useState(false);

  function applyTariff(row: TrendyolTariff) {
    setTariff(row);
    const v = row.versions?.find((item) => item.version === row.activeVersion) ?? row.versions?.[0];
    if (!v) return;
    setTable(String(v.defaultTable));
    setCarrier(v.defaultCarrier);
    setPhb(String(v.phbNetTry));
    setSameDay(String(v.phbSameDayNetTry));
    const cell = v.barem.find((b) => b.carrier === 'Aras' && b.table === v.defaultTable && b.bandMaxCustomerTry === 199.99);
    if (cell) setArasNet(String(cell.netTry));
  }

  useEffect(() => {
    if (!hasTrendyol) return;
    void fetchTrendyolTariff()
      .then(applyTariff)
      .catch(() => setTariffNote('Tarife okunamadı.'));
  }, [hasTrendyol]);

  async function onSaveTariff() {
    if (!tariff?.versions?.length) return;
    setTariffBusy(true);
    setTariffNote(null);
    try {
      const versions = tariff.versions.map((row) => {
        if (row.version !== (tariff.activeVersion ?? row.version)) return row;
        const net = moneyInput(arasNet) ?? 48.33;
        const vat = row.vatRate || 0.2;
        const gross = net === 48.33 ? 57.99 : Math.round(net * (1 + vat) * 100) / 100;
        const tbl = table === '2' ? 2 : 1;
        return {
          ...row,
          defaultTable: tbl,
          defaultCarrier: carrier.trim() || 'Aras',
          phbNetTry: moneyInput(phb) ?? 10.99,
          phbSameDayNetTry: moneyInput(sameDay) ?? 4.99,
          barem: row.barem.map((b) =>
            b.carrier === 'Aras' && b.bandMaxCustomerTry === 199.99 && b.table === tbl
              ? { ...b, netTry: net, grossTry: gross }
              : b,
          ),
        };
      });
      const saved = await saveTrendyolTariff({ versions, activeVersion: tariff.activeVersion });
      applyTariff(saved);
      setTariffNote('Tarife v' + saved.activeVersion + ' kaydedildi. Değerler PDF kazınmaz; sen düzenlersin.');
      refresh();
    } catch (err) {
      setTariffNote(err instanceof Error ? err.message : 'Tarife kaydedilemedi.');
    } finally {
      setTariffBusy(false);
    }
  }

  const notices = shops.flatMap((shop) => [shop.tariffSourceNotice, shop.tariffMismatchNotice].filter(Boolean) as string[]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Mağazalarım</Text>
          <Text style={styles.sub}>Satış kanallarını tek yerde.</Text>
          <View style={styles.counts}>
            <Text style={styles.count}>{shops.length} bağlı mağaza</Text>
            <Text style={styles.countMuted}>{shops.length ? `${shops.length} mağaza` : '1 işlem uyarısı'}</Text>
          </View>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error ? (
          <View style={styles.sheet}>
            <ErrorState title="Mağazalar yüklenemedi" body={error} onRetry={refresh} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            <PeachAlert text="Yazma kapalı. BLOKE kanallar bağlı sayılmaz." />
            {notices.map((text) => (
              <PeachAlert key={text} text={text} />
            ))}
            <Text style={styles.section}>Bağlı mağazalar</Text>
            {shops.length === 0 ? (
              <View style={styles.emptyCard}>
                <ChannelBadge />
                <Text style={styles.emptyTitle}>Kanal bağlı değil</Text>
                <Text style={styles.emptyBody}>{orgName ?? 'İşletme'} için henüz yetkili mağaza yok.</Text>
              </View>
            ) : (
              shops.map((shop) => (
                <View key={shop.id} style={styles.emptyCard}>
                  <ChannelBadge channel={shop.channel} />
                  <Text style={styles.emptyTitle}>{shop.sellerLabel}</Text>
                  <Text style={styles.emptyBody}>{shopStatusLabel(shop.status, shop.statusLabel)}</Text>
                </View>
              ))
            )}
            {hasTrendyol ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Trendyol tarife v{tariff?.activeVersion ?? 1}</Text>
                <Text style={styles.emptyBody}>
                  Tohum: Akademi kargo baremi 10 Ağustos 2026 + desi PDF 13 Temmuz 2026. Aras Tablo 1 · 0–199,99 · 48,33 +
                  %20 KDV = 57,99. PHB 10,99 + KDV; Bugün Kargoda 4,99 + KDV. PDF otomatik okunmaz.
                </Text>
                <Text style={styles.link}>{tariff?.cargoRuleUrl}</Text>
                <Text style={styles.link}>{tariff?.desiPdfUrl}</Text>
                <Text style={styles.link}>{tariff?.phbRuleUrl}</Text>
                <TextField label="Varsayılan tablo (1 avantajlı / 2 standart)" value={table} onChangeText={setTable} />
                <TextField label="Varsayılan kargo firması" value={carrier} onChangeText={setCarrier} />
                <TextField label="Aras 0–199,99 Tablo net (KDV hariç)" value={arasNet} onChangeText={setArasNet} keyboardType="decimal-pad" />
                <TextField label="PHB net (KDV hariç)" value={phb} onChangeText={setPhb} keyboardType="decimal-pad" hint="10,99 + %20 = 13,19 tahmini; fatura değil." />
                <TextField label="Bugün Kargoda PHB net" value={sameDay} onChangeText={setSameDay} keyboardType="decimal-pad" />
                <Button label="Tarifeyi kaydet" loading={tariffBusy} onPress={() => void onSaveTariff()} />
                <Button
                  label="Kaynağı kontrol et"
                  variant="ghost"
                  onPress={() => {
                    void checkTrendyolTariff()
                      .then((row) => {
                        applyTariff(row);
                        setTariffNote(row.sourceCheckNotice || 'Kaynak aynı. Tutarlar değişmedi.');
                        refresh();
                      })
                      .catch((err) => setTariffNote(err instanceof Error ? err.message : 'Kontrol başarısız.'));
                  }}
                />
                {tariffNote ? <Text style={styles.emptyBody}>{tariffNote}</Text> : null}
              </View>
            ) : null}
            <Button label="Yeni mağaza bağla" trailing="add" onPress={() => router.push('/(tabs)/magaza-bagla')} />
            {shops.length > 0 ? (
              <Button label="Ürünleri içeri al" variant="ghost" onPress={() => router.push('/(tabs)/icerik-al')} />
            ) : null}
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
  counts: { flexDirection: 'row', gap: 16, marginTop: 8 },
  count: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  countMuted: { fontFamily: fonts.medium, fontSize: 14, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 14, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
  },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  link: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, lineHeight: 16 },
});
