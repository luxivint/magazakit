import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { ErrorState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { ApiError, fetchPrinter, savePrinter, testPrinter } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function TermalScreen() {
  const { idToken } = useAuth();
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const settings = await fetchPrinter();
      setName(settings.name);
      setHost(settings.host ?? '');
      setEnabled(Boolean(settings.host));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yazıcı ayarı yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (nextEnabled = enabled) => {
    setBusy(true);
    setBanner(null);
    try {
      const saved = await savePrinter({
        name: name.trim() || undefined,
        host: nextEnabled ? host.trim() || null : null,
      });
      setName(saved.name);
      setHost(saved.host ?? '');
      setEnabled(Boolean(saved.host) || nextEnabled);
      setBanner('Ayar kaydedildi. Cihaza basılmaz.');
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Ayar tamamlanmış sayılmaz.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await save(next);
  };

  const test = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const result = await testPrinter();
      setBanner(result.note);
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Yazdırma tamamlanmış sayılmaz.');
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
          <Text style={styles.title}>Termal yazıcı</Text>
          <Text style={styles.sub}>Ayar kaydı. Test mock; kâğıda basılmaz.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error ? (
          <ErrorState title="Yazıcı yüklenemedi" body={error} onRetry={() => void load()} />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            {banner ? <ConfigBanner text={banner} /> : null}
            <Pressable
              style={styles.row}
              onPress={() => void toggle()}
              disabled={busy}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>Termal yazıcı</Text>
                <Text style={styles.meta}>{enabled ? 'Kayıt açık · basılmaz' : 'Kapalı'}</Text>
              </View>
              <View style={[styles.track, enabled && styles.trackOn]}>
                <View style={[styles.thumb, enabled && styles.thumbOn]} />
              </View>
            </Pressable>
            <TextField label="Yazıcı adı" value={name} onChangeText={setName} placeholder="Varsayılan termal" />
            <TextField label="Adres (isteğe bağlı)" value={host} onChangeText={setHost} placeholder="bağlı değil" />
            <Button label="Kaydet" variant="ghost" loading={busy} onPress={() => void save()} />
            <Button label="Test yazdır" variant="lime" loading={busy} onPress={() => void test()} />
            <Text style={styles.meta}>POST test-print mock. Termal yazıcıya gönderilmez.</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  track: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.sheetLine,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  trackOn: { backgroundColor: colors.lime },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
  },
  thumbOn: { alignSelf: 'flex-end', backgroundColor: colors.graphite },
});
