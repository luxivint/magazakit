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
import { fetchTrendyolTariff, saveTrendyolTariff } from '@/lib/apiClient';
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
  const [bandLow, setBandLow] = useState('');
  const [bandHigh, setBandHigh] = useState('');
  const [phb, setPhb] = useState('');
  const [cargoUrl, setCargoUrl] = useState('');
  const [phbUrl, setPhbUrl] = useState('');
  const [tariffNote, setTariffNote] = useState<string | null>(null);
  const [tariffBusy, setTariffBusy] = useState(false);

  useEffect(() => {
    if (!hasTrendyol) return;
    void fetchTrendyolTariff()
      .then((row) => {
        setBandLow(row.cargoBands.find((b) => b.maxCustomerTry <= 199.99)?.amountTry?.toString() ?? '');
        setBandHigh(row.cargoBands.find((b) => b.maxCustomerTry > 199.99)?.amountTry?.toString() ?? '');
        setPhb(row.phbGrossTry != null ? String(row.phbGrossTry) : '');
        setCargoUrl(row.cargoRuleUrl);
        setPhbUrl(row.phbRuleUrl);
      })
      .catch(() => {
        setTariffNote('Tarife okunamadı.');
      });
  }, [hasTrendyol]);

  async function onSaveTariff() {
    setTariffBusy(true);
    setTariffNote(null);
    try {
      const saved = await saveTrendyolTariff({
        cargoBands: [
          { maxCustomerTry: 199.99, amountTry: moneyInput(bandLow) },
          { maxCustomerTry: 349.99, amountTry: moneyInput(bandHigh) },
        ],
        phbGrossTry: moneyInput(phb),
      });
      setTariffNote(
        saved.cargoBands[0]?.amountTry != null || saved.phbGrossTry != null
          ? 'Tarife kaydedildi. Teslim siparişlerde tahmini (tarife); fatura gelince fatura yazar.'
          : 'Tutar boş. 57,99 koda gömülmez; panelinden kopyala.',
      );
    } catch (err) {
      setTariffNote(err instanceof Error ? err.message : 'Tarife kaydedilemedi.');
    } finally {
      setTariffBusy(false);
    }
  }

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
            <ErrorState
              title="Mağazalar yüklenemedi"
              body={error}
              onRetry={refresh}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            <PeachAlert text="Yazma kapalı. BLOKE kanallar bağlı sayılmaz." />
            <Text style={styles.section}>Bağlı mağazalar</Text>
            {shops.length === 0 ? (
              <View style={styles.emptyCard}>
                <ChannelBadge />
                <Text style={styles.emptyTitle}>Kanal bağlı değil</Text>
                <Text style={styles.emptyBody}>
                  {orgName ?? 'İşletme'} için henüz yetkili mağaza yok.
                </Text>
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
                <Text style={styles.emptyTitle}>Trendyol kargo / PHB tarife tablosu</Text>
                <Text style={styles.emptyBody}>
                  Akademi kargo baremi tutar basmaz. 57,99 panelden kopyalanır. PHB sayfasında da 10,99 koda
                  gömülmez; KDV dahil tutarı sen yazarsın.
                </Text>
                <Text style={styles.link}>{cargoUrl || 'https://akademi.trendyol.com/satici-bilgi-merkezi/detay/kargo-baremi-uygulamasi'}</Text>
                <Text style={styles.link}>{phbUrl || 'https://akademi.trendyol.com/satici-bilgi-merkezi/detay/platform-hizmet-bedeli'}</Text>
                <TextField
                  label="Kargo 0–199,99 TL (KDV dahil, TL)"
                  value={bandLow}
                  onChangeText={setBandLow}
                  keyboardType="decimal-pad"
                  placeholder="Paneldeki tutar"
                />
                <TextField
                  label="Kargo 200–349,99 TL (KDV dahil, TL)"
                  value={bandHigh}
                  onChangeText={setBandHigh}
                  keyboardType="decimal-pad"
                />
                <TextField
                  label="PHB sipariş başı (KDV dahil, TL)"
                  value={phb}
                  onChangeText={setPhb}
                  keyboardType="decimal-pad"
                  hint="Örnek doğrulama: 10,99 + %20 KDV = 13,19. Faturada n=1 ise tahsis bu tutara denk düşer."
                />
                <Button label="Tarifeyi kaydet" loading={tariffBusy} onPress={() => void onSaveTariff()} />
                {tariffNote ? <Text style={styles.emptyBody}>{tariffNote}</Text> : null}
              </View>
            ) : null}
            <Button
              label="Yeni mağaza bağla"
              trailing="add"
              onPress={() => router.push('/(tabs)/magaza-bagla')}
            />
            {shops.length > 0 ? (
              <Button
                label="Ürünleri içeri al"
                variant="ghost"
                onPress={() => router.push('/(tabs)/icerik-al')}
              />
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
