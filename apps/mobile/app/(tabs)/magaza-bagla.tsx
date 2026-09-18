import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/context/AuthContext';
import { useShops } from '@/context/ShopContext';
import { ApiError } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function MagazaBaglaScreen() {
  const { orgName } = useAuth();
  const { connectMock } = useShops();
  const [storeName, setStoreName] = useState(orgName ?? '');
  const [sellerId, setSellerId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const test = async () => {
    setBusy(true);
    setResult(null);
    try {
      void apiKey;
      void apiSecret;
      const shop = await connectMock(sellerId);
      setResult(`${shop.statusLabel}. Anahtar gönderilmedi. ${shop.k01}`);
    } catch (e) {
      setResult(e instanceof ApiError ? e.message : 'Bağlantı denendi sayılmaz.');
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
        <BrandMark />
        <Text style={styles.headline}>Mağazanı bağla</Text>
        <Text style={styles.lead}>Satış kanalını hesabına ekle.</Text>
        <View style={styles.steps}>
          <Text style={styles.stepMuted}>1 İşletme</Text>
          <Text style={styles.stepOn}>2 Mağaza</Text>
          <Text style={styles.stepMuted}>3 Ürünler</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Pazaryeri seç</Text>
          <View style={styles.channelOn}>
            <ChannelBadge />
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          </View>
          <Text style={styles.hint}>Hepsiburada F4’e kadar gizli. API Key/Secret Nest’e gitmez (K01 mock).</Text>
          <TextField
            label="Mağaza adı"
            placeholder="Ayşe Home"
            value={storeName}
            onChangeText={setStoreName}
            autoCapitalize="words"
          />
          <TextField
            label="Satıcı ID"
            placeholder="Satıcı numarası"
            value={sellerId}
            onChangeText={setSellerId}
            keyboardType="number-pad"
          />
          <TextField label="API Key" placeholder="Cihazda kalır" value={apiKey} onChangeText={setApiKey} />
          <TextField
            label="API Secret"
            placeholder="••••••••"
            value={apiSecret}
            onChangeText={setApiSecret}
            secureTextEntry
          />
          {result ? <ConfigBanner text={result} /> : null}
          {result && !result.includes('sayılmaz') ? (
            <Button label="Ürünleri içeri al" variant="ghost" onPress={() => router.push('/(tabs)/icerik-al')} />
          ) : null}
          <Button
            label="Bağlantıyı test et"
            icon="link-outline"
            trailing="arrow-forward"
            onPress={() => void test()}
            loading={busy}
          />
          <Pressable onPress={() => router.replace('/(tabs)/magazalar')}>
            <Text style={styles.skip}>Daha sonra bağla</Text>
          </Pressable>
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite, paddingHorizontal: space.xl, paddingBottom: 22, paddingTop: 8 },
  back: { width: 36, height: 36, justifyContent: 'center', marginBottom: 8 },
  headline: { marginTop: 8, fontFamily: fonts.bold, fontSize: 26, color: colors.white, letterSpacing: -0.5 },
  lead: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  steps: { flexDirection: 'row', gap: 14, marginTop: 14 },
  stepOn: { fontFamily: fonts.semibold, fontSize: 13, color: colors.lime },
  stepMuted: { fontFamily: fonts.medium, fontSize: 13, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  channelOn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: -4 },
  skip: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: colors.muted, paddingVertical: 8 },
});
