import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, space } from '@/theme/tokens';

export default function HesapOlusturScreen() {
  const { user, orgName, configured, signUpEmail } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (user && !orgName) return <Redirect href="/(auth)/isletme" />;
  if (user && orgName) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Ad soyad zorunlu.';
    if (!email.includes('@')) next.email = 'Geçerli bir e-posta gir.';
    if (password.length < 6) next.password = 'En az 6 karakter kullan.';
    if (password !== repeat) next.repeat = 'Şifreler uyuşmuyor.';
    if (!terms) next.terms = 'Devam etmek için koşulları kabul et.';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!configured) {
      setErrors({ form: 'Firebase yapılandırılmadı' });
      return;
    }
    setBusy(true);
    try {
      await signUpEmail(name, email, password);
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
        <Link href="/(auth)/giris" asChild>
          <Pressable style={styles.back} accessibilityLabel="Geri">
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
        </Link>
        <BrandMark />
        <Text style={styles.headline}>Hesabını oluştur</Text>
        <Text style={styles.lead}>Mağazalarını tek yerden yönetmeye başla.</Text>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Hesap bilgileri</Text>
          {!configured ? (
            <ConfigBanner text="Kayıt yapılandırması eksik. E-posta ile hesap açılamaz." />
          ) : null}
          <TextField
            label="Ad soyad"
            placeholder="Adın ve soyadın"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            error={errors.name}
          />
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
            placeholder="Şifre oluştur"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            hint="En az 6 karakter kullan."
            error={errors.password}
          />
          <TextField
            label="Şifre tekrar"
            placeholder="Şifreni tekrar gir"
            value={repeat}
            onChangeText={setRepeat}
            secureTextEntry
            error={errors.repeat}
          />
          <Pressable style={styles.check} onPress={() => setTerms((v) => !v)}>
            <View style={[styles.box, terms && styles.boxOn]}>
              {terms ? <Ionicons name="checkmark" size={14} color={colors.graphite} /> : null}
            </View>
            <Text style={styles.checkText}>Kullanım koşullarını okudum ve kabul ediyorum.</Text>
          </Pressable>
          {errors.terms ? <Text style={styles.formError}>{errors.terms}</Text> : null}
          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
          <Button
            label="Hesap oluştur"
            trailing="arrow-forward"
            onPress={() => void submit()}
            loading={busy}
            disabled={!configured}
          />
          <GoogleSignInButton disabled={!configured} />
          <Text style={styles.footer}>
            Zaten hesabın var mı?{' '}
            <Link href="/(auth)/giris" style={styles.link}>
              Giriş yap
            </Link>
          </Text>
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite, paddingHorizontal: space.xl, paddingBottom: 24, paddingTop: 8 },
  back: { width: 36, height: 36, justifyContent: 'center', marginBottom: 8 },
  headline: { marginTop: 10, fontFamily: fonts.bold, fontSize: 28, color: colors.white, letterSpacing: -0.6 },
  lead: { marginTop: 8, fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.4,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  checkText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.ink, lineHeight: 18 },
  formError: { fontFamily: fonts.medium, fontSize: 13, color: '#C45C4A' },
  footer: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 4 },
  link: { fontFamily: fonts.semibold, color: colors.ink },
});
