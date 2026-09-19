import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { TextField } from '@/components/ui/TextField';
import { useShops } from '@/context/ShopContext';
import { ApiError } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function HepsiburadaScreen() {
  const { connectChannel } = useShops();
  const [merchantId, setMerchantId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(
    'Merchant + key/secret bir kez API’ye gider, org mağazasında şifrelenir. Telefonda kalmaz.',
  );

  const connect = async () => {
    setBusy(true);
    try {
      const shop = await connectChannel('hepsiburada', { merchantId, apiKey, apiSecret });
      setApiKey('');
      setApiSecret('');
      setBanner(`${shop.statusLabel}. Yazma kapalı. Anahtar telefonda yok.`);
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Hepsiburada bağlı sayılmaz.');
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
          <Text style={styles.title}>Hepsiburada</Text>
          <Text style={styles.sub}>listing-external + oms-external. Salt okuma.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          {banner ? <ConfigBanner text={banner} /> : null}
          <View style={styles.card}>
            <View style={styles.hb}>
              <Text style={styles.hbMark}>hb</Text>
            </View>
            <Text style={styles.name}>Hepsiburada</Text>
            <Text style={styles.meta}>
              User-Agent yalın Magazam. SIT için bağlarken sandbox işaretlenmez; prod host kullanılır.
            </Text>
          </View>
          <TextField label="Merchant ID" value={merchantId} onChangeText={setMerchantId} placeholder="merchantId" />
          <TextField label="API key" value={apiKey} onChangeText={setApiKey} placeholder="Basic kullanıcı" secureTextEntry />
          <TextField label="API secret" value={apiSecret} onChangeText={setApiSecret} placeholder="Basic parola" secureTextEntry />
          <Button label="Bağla" onPress={() => void connect()} loading={busy} />
        </ScrollView>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
    alignItems: 'flex-start',
  },
  hb: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E31E24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hbMark: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
});
