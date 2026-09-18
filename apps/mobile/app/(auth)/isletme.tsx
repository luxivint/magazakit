import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function IsletmeScreen() {
  const { user, orgName, setOrg } = useAuth();
  const [name, setName] = useState(orgName ?? '');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  if (!user) return <Redirect href="/(auth)/giris" />;
  if (orgName) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    if (name.trim().length < 2) {
      setError('İşletme adı zorunlu.');
      return;
    }
    setBusy(true);
    await setOrg(name);
    setBusy(false);
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Link href="/(auth)/giris" asChild>
          <Pressable style={styles.back} accessibilityLabel="Geri">
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
        </Link>
        <BrandMark />
        <Text style={styles.headline}>İşletmeni oluşturalım.</Text>
        <Text style={styles.lead}>Mağazalarını bağlamadan önce seni tanıyalım.</Text>
        <View style={styles.steps}>
          <Step n={1} label="İşletme" active />
          <Step n={2} label="Mağaza" />
          <Step n={3} label="Ürünler" />
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <View style={styles.sheet}>
          <Text style={styles.section}>İşletme bilgileri</Text>
          <TextField
            label="İşletme adı"
            placeholder="Görünen işletme adı"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={error}
          />
          <Text style={styles.meta}>Sahip: {user.name}</Text>
          <Text style={styles.section}>Pazaryeri</Text>
          <Text style={styles.hint}>v1 yalnız Trendyol. Hepsiburada F4’e kadar gizli.</Text>
          <View style={styles.channel}>
            <ChannelBadge />
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          </View>
          <Button
            label="Kaydet ve devam et"
            trailing="arrow-forward"
            onPress={() => void submit()}
            loading={busy}
          />
        </View>
      </PorcelainSheet>
    </View>
  );
}

function Step({ n, label, active }: { n: number; label: string; active?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepN, active && styles.stepOn]}>
        <Text style={[styles.stepNText, active && styles.stepNTextOn]}>{n}</Text>
      </View>
      <Text style={[styles.stepLabel, active && { color: colors.white }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite, paddingHorizontal: space.xl, paddingBottom: 24, paddingTop: 8 },
  back: { width: 36, height: 36, justifyContent: 'center', marginBottom: 8 },
  headline: { marginTop: 10, fontFamily: fonts.bold, fontSize: 26, color: colors.white, letterSpacing: -0.5 },
  lead: { marginTop: 8, fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  steps: { flexDirection: 'row', gap: 16, marginTop: 18 },
  step: { alignItems: 'center', gap: 6 },
  stepN: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4A5050',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  stepNText: { fontFamily: fonts.bold, fontSize: 13, color: colors.mutedOnDark },
  stepNTextOn: { color: colors.graphite },
  stepLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 12 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: -4 },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    padding: 14,
  },
});
