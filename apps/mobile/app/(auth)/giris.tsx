import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, space } from '@/theme/tokens';

export default function GirisScreen() {
  const { user, orgName, configured, signInEmail, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [resetNote, setResetNote] = useState<string | null>(null);

  if (user && !orgName) return <Redirect href="/(auth)/isletme" />;
  if (user && orgName) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    const next: typeof errors = {};
    if (!email.includes('@')) next.email = 'Geçerli bir e-posta gir.';
    if (password.length < 6) next.password = 'Şifre en az 6 karakter olmalı.';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!configured) {
      setErrors({ form: 'Firebase yapılandırılmadı' });
      return;
    }
    setBusy(true);
    try {
      await signInEmail(email, password);
      router.replace('/(auth)/isletme');
    } catch (e) {
      setErrors({ form: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <BrandMark />
        <Text style={styles.headline}>Tüm mağazaların.</Text>
        <Text style={styles.headline}>
          <Text style={styles.underline}>Tek bir yerde.</Text>
        </Text>
        <Text style={styles.lead}>Sipariş, stok ve fiyatlarını kolayca yönet.</Text>
        <View style={styles.pills}>
          <HeroChip name="cube-outline" label="Siparişleri takip et" />
          <HeroChip name="layers-outline" label="Stoklarını yönet" />
          <HeroChip name="pricetag-outline" label="Fiyatlarını güncelle" />
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <View style={styles.sheet}>
          <Text style={styles.hello}>Hoş geldin</Text>
          <Text style={styles.sub}>Devam etmek için hesabına giriş yap.</Text>
          {!configured ? (
            <ConfigBanner text="Giriş yapılandırması eksik. E-posta ile giriş kullanılamaz." />
          ) : null}
          <TextField
            label="E-posta"
            placeholder="E-posta adresin"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={errors.email}
          />
          <TextField
            label="Şifre"
            placeholder="Şifren"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
          />
          <Pressable
            style={styles.forgot}
            onPress={() => {
              if (!configured) {
                setResetNote('Firebase yapılandırılmadı');
                return;
              }
              if (!email.includes('@')) {
                setErrors({ email: 'Sıfırlama için e-posta gir.' });
                return;
              }
              void resetPassword(email)
                .then(() => setResetNote('Sıfırlama bağlantısı e-postana gönderildi.'))
                .catch((e) => setResetNote((e as Error).message));
            }}>
            <Text style={styles.forgotText}>Şifremi unuttum</Text>
          </Pressable>
          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
          {resetNote ? <Text style={styles.hint}>{resetNote}</Text> : null}
          <Button
            label="Giriş yap"
            trailing="arrow-forward"
            onPress={() => void submit()}
            loading={busy}
            disabled={!configured}
          />
          <GoogleSignInButton disabled={!configured} />
          <Text style={styles.footer}>
            Henüz hesabın yok mu?{' '}
            <Link href="/(auth)/hesap-olustur" style={styles.link}>
              Hesap oluştur
            </Link>
          </Text>
        </View>
      </PorcelainSheet>
    </View>
  );
}

function HeroChip({ name, label }: { name: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={name} size={16} color={colors.lime} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite, paddingHorizontal: space.xl, paddingBottom: 28, paddingTop: 12 },
  headline: {
    marginTop: 6,
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.white,
    letterSpacing: -0.6,
  },
  underline: {
    color: colors.white,
    textDecorationLine: 'underline',
    textDecorationColor: colors.lime,
  },
  lead: { marginTop: 10, fontFamily: fonts.regular, fontSize: 13, color: colors.mutedOnDark },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  chip: { alignItems: 'center', width: 96, gap: 6 },
  chipText: { fontFamily: fonts.medium, fontSize: 11, color: colors.mutedOnDark, textAlign: 'center' },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 36 },
  hello: { fontFamily: fonts.bold, fontSize: 26, color: colors.ink, letterSpacing: -0.4 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginBottom: 4 },
  forgot: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  formError: { fontFamily: fonts.medium, fontSize: 13, color: '#C45C4A' },
  hint: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  footer: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 8 },
  link: { fontFamily: fonts.semibold, color: colors.ink },
});
