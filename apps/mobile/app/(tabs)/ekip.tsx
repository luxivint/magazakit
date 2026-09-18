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
import { ApiError, fetchTeam, fetchTeamMembers, inviteTeamMember, type OrgInvite, type OrgMember } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

function roleTr(role: OrgMember['role'] | OrgInvite['role']): string {
  return role === 'owner' ? 'Sahip' : 'Ekip';
}

export default function EkipScreen() {
  const { idToken } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) {
      setMembers([]);
      setInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [team, roster] = await Promise.all([fetchTeam(), fetchTeamMembers()]);
      setMembers(roster.members.length ? roster.members : team.members);
      setInvites(roster.invites.length ? roster.invites : team.invites);
      setError(null);
    } catch (e) {
      setMembers([]);
      setInvites([]);
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
      const saved = await inviteTeamMember(value);
      setBanner(
        saved.emailSent ? 'Davet e-postası gitti.' : `Davet kaydedildi (${saved.email}). E-posta gönderilmedi.`,
      );
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
          <Text style={styles.sub}>Davet e-posta ile kaydedilir. Rol matrisi yok.</Text>
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
            <Button label="Davet gönder" loading={busy} onPress={() => void invite()} />
            <Text style={styles.section}>Üyeler</Text>
            {members.map((m) => (
              <View key={`${m.uid ?? m.email}-${m.role}`} style={styles.card}>
                <Text style={styles.name}>{m.email || 'İşletme sahibi'}</Text>
                <Text style={styles.meta}>
                  {roleTr(m.role)} · {m.status === 'active' ? 'aktif' : 'davet'}
                </Text>
              </View>
            ))}
            <Text style={styles.section}>Bekleyen davet</Text>
            {invites.length === 0 ? (
              <Text style={styles.meta}>Bekleyen davet yok.</Text>
            ) : (
              invites.map((inv) => (
                <View key={inv.id} style={styles.card}>
                  <Text style={styles.name}>{inv.email}</Text>
                  <Text style={styles.meta}>
                    {roleTr(inv.role)} · bekliyor · e-posta {inv.emailSent ? 'gitti' : 'gönderilmedi'}
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
});
