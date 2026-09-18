import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCatalog } from '@/context/CatalogContext';
import { ApiError, publishListing } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function YayinScreen() {
  const catalog = useCatalog();
  const mapped = catalog.products.filter((p) => p.mapped);
  const [step, setStep] = useState(1);
  const [listingId, setListingId] = useState<string | null>(mapped[0]?.listingId ?? null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const publish = async () => {
    if (!listingId) {
      setBanner('Önce eşli bir ürün seç.');
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      await publishListing(listingId, 'trendyol');
      setBanner('Yayın kuyruğa alındı.');
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Yayın tamamlanmış sayılmaz.');
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
          <Text style={styles.title}>Katalog yayın</Text>
          <Text style={styles.sub}>Üç adım. Hepsiburada canlı kanal değil.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {catalog.products.length === 0 ? (
          <EmptyState
            title="Önce içeri al"
            body="Yayın sihirbazı eşli ürün ister."
            primary="İçeri al"
            onPrimary={() => router.push('/(tabs)/icerik-al')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            {banner ? <ConfigBanner text={banner} /> : null}
            <Text style={styles.steps}>Adım {step} / 3</Text>

            {step === 1 ? (
              <>
                <Text style={styles.section}>Kanal</Text>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <ChannelBadge />
                    <Text style={styles.name}>Trendyol</Text>
                  </View>
                  <Text style={styles.meta}>Tek canlı kanal.</Text>
                </View>
                <View style={[styles.card, styles.mutedCard]}>
                  <Text style={styles.name}>Hepsiburada</Text>
                  <Text style={styles.meta}>Yakında. Canlı kanal değil.</Text>
                </View>
                <Button label="İleri" onPress={() => setStep(2)} />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.section}>Ürün</Text>
                {mapped.length === 0 ? (
                  <Text style={styles.meta}>Eşli SKU yok. Önce eşleştir.</Text>
                ) : (
                  mapped.map((p) => (
                    <Pressable
                      key={p.listingId}
                      style={[styles.card, listingId === p.listingId && styles.cardOn]}
                      onPress={() => setListingId(p.listingId)}>
                      <Text style={styles.name}>{p.name}</Text>
                      <Text style={styles.meta}>SKU {p.sku}</Text>
                    </Pressable>
                  ))
                )}
                <Button label="Geri" variant="ghost" onPress={() => setStep(1)} />
                <Button label="İleri" disabled={!listingId} onPress={() => setStep(3)} />
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={styles.section}>Yayınla</Text>
                <Text style={styles.meta}>
                  Taslak yayın. Başarılı demek için sunucu kuyruğu gerekir. Öneri motoru yok.
                </Text>
                <Button label="Geri" variant="ghost" onPress={() => setStep(2)} />
                <Button label="Yayını gönder" variant="lime" loading={busy} onPress={() => void publish()} />
              </>
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
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  steps: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 4,
  },
  cardOn: { borderColor: colors.graphite, borderWidth: 2 },
  mutedCard: { opacity: 0.7 },
});
