import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/TextField';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { ApiError, fetchTeam, inviteTeamMember, type TeamMember } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

const ROLES = ['Depo', 'Muhasebe', 'Yönetici'] as const;

export default function EkipScreen() {
  const { idToken } = useAuth();
  const [items, setItems] = useState<TeamMember[]>([]);
  const [source, setSource] = useState<'api' | 'missing' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('Depo');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchTeam();
      setItems(page.items);
      setSource(page.source);
      setError(null);
    } catch (e) {
      setItems([]);
      setError(e instanceof ApiError ? e.message : 'Ekip yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    const value = email.trim();
    if (!value.includes('@')) {
      setBanner('Geçerli bir e-posta yaz.');
      return;
    }
    setBusy(true);
    setBanner(null);
    try {
      await inviteTeamMember(value, role);
      setBanner('Davet kaydedildi.');
      setEmail('');
      await load();
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'Davet tamamlanmış sayılmaz.');
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
          <Text style={styles.title}>Ekip</Text>
          <Text style={styles.sub}>Davet gönder. Rol matrisi yok.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error ? (
          <ErrorState title="Ekip yüklenemedi" body={error} onRetry={() => void load()} />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
            {banner ? <ConfigBanner text={banner} /> : null}
            <Text style={styles.section}>Davet</Text>
            <TextField
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              placeholder="kisi@ornek.com"
              keyboardType="email-address"
            />
            <View style={styles.roles}>
              {ROLES.map((r) => (
                <Pressable key={r} style={[styles.role, role === r && styles.roleOn]} onPress={() => setRole(r)}>
                  <Text style={[styles.roleText, role === r && styles.roleTextOn]}>{r}</Text>
                </Pressable>
              ))}
            </View>
            <Button label="Davet gönder" loading={busy} onPress={() => void invite()} />
            <Text style={styles.section}>Üyeler</Text>
            {items.length === 0 ? (
              source === 'missing' ? (
                <EmptyState
                  title="Ekip defteri yok"
                  body="Sunucu henüz ekip listesini açmadı. Davet yazılır, uydurma üye yok."
                  primary="Yenile"
                  onPrimary={() => void load()}
                />
              ) : (
                <Text style={styles.meta}>Henüz üye yok.</Text>
              )
            ) : (
              items.map((m) => (
                <View key={m.id} style={styles.card}>
                  <Text style={styles.name}>{m.name || m.email}</Text>
                  <Text style={styles.meta}>
                    {m.role ?? 'Rol yok'} · {m.status ?? 'davet'}
                  </Text>
                </View>
              ))
            )}
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
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 8 },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 4,
  },
  roles: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  role: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    backgroundColor: colors.white,
  },
  roleOn: { backgroundColor: colors.graphite, borderColor: colors.graphite },
  roleText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  roleTextOn: { color: colors.white },
});
