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
import { DesiFields, parseDim, type DesiValues } from '@/components/catalog/DesiFields';
import { useCatalog } from '@/context/CatalogContext';
import { ApiError, fetchListingDraft, publishListing, saveListingDraft, type ListingDraft } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function YayinScreen() {
  const catalog = useCatalog();
  const [step, setStep] = useState(1);
  const [listingId, setListingId] = useState<string | null>(catalog.products[0]?.listingId ?? null);
  const [draft, setDraft] = useState<ListingDraft | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [desi, setDesi] = useState<DesiValues>({ weightKg: '', widthCm: '', heightCm: '', lengthCm: '' });
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const loadDraft = async (id: string) => {
    setBusy(true);
    setBanner(null);
    try {
      const next = await fetchListingDraft(id);
      setDraft(next);
      setTitle(next.title);
      setPrice(String(next.priceTry));
      setDesi({
        weightKg: next.weightKg != null ? String(next.weightKg) : '',
        widthCm: next.widthCm != null ? String(next.widthCm) : '',
        heightCm: next.heightCm != null ? String(next.heightCm) : '',
        lengthCm: next.lengthCm != null ? String(next.lengthCm) : '',
      });
      setStep(3);
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Taslak okunamadı.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!listingId) return;
    setBusy(true);
    setBanner(null);
    try {
      const parsed = Number(price.replace(',', '.'));
      const next = await saveListingDraft(listingId, {
        title: title.trim() || undefined,
        priceTry: Number.isFinite(parsed) ? parsed : undefined,
        weightKg: parseDim(desi.weightKg),
        widthCm: parseDim(desi.widthCm),
        heightCm: parseDim(desi.heightCm),
        lengthCm: parseDim(desi.lengthCm),
      });
      setDraft(next);
      setBanner('Taslak kaydedildi. Canlı pazaryeri yazılmadı.');
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Taslak tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!listingId) return;
    setBusy(true);
    setBanner(null);
    try {
      const next = await publishListing(listingId);
      setDraft(next);
      setBanner(
        next.mock
          ? 'Mock yayın. Canlı Trendyol yazılmadı.'
          : 'Taslak kaldı. Canlı yazım yok.',
      );
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
          <Text style={styles.sub}>Taslak, sonra mock yayın. Canlı kanal yazımı yok.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {catalog.products.length === 0 ? (
          <EmptyState
            title="Önce içeri al"
            body="Yayın sihirbazı ilan ister."
            primary="İçeri al"
            onPrimary={() => router.push('/(tabs)/icerik-al')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
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
                  <Text style={styles.meta}>Mock yayın. Hepsiburada canlı değil.</Text>
                </View>
                <Button label="İleri" onPress={() => setStep(2)} />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={styles.section}>İlan</Text>
                {catalog.products.map((p) => (
                  <Pressable
                    key={p.listingId}
                    style={[styles.card, listingId === p.listingId && styles.cardOn]}
                    onPress={() => setListingId(p.listingId)}>
                    <Text style={styles.name}>{p.name}</Text>
                    <Text style={styles.meta}>{p.listingId}</Text>
                  </Pressable>
                ))}
                <Button label="Geri" variant="ghost" onPress={() => setStep(1)} />
                <Button
                  label="Taslağı aç"
                  disabled={!listingId}
                  loading={busy}
                  onPress={() => listingId && void loadDraft(listingId)}
                />
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Text style={styles.section}>Taslak / yayın</Text>
                <Text style={styles.meta}>
                  {draft ? `${draft.state === 'mock_live' ? 'Mock yayında' : 'Taslak'} · canlı yazım yok` : ''}
                </Text>
                <TextField label="Başlık" value={title} onChangeText={setTitle} />
                <TextField
                  label="Fiyat (₺)"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
                <DesiFields values={desi} onChange={setDesi} />
                <Button label="Taslağı kaydet" variant="ghost" loading={busy} onPress={() => void save()} />
                <Button label="Mock yayınla" variant="lime" loading={busy} onPress={() => void publish()} />
                <Button label="Geri" variant="ghost" onPress={() => setStep(2)} />
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
});
