import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { initials, useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/context/CatalogContext';
import { useDemoState, type DemoState } from '@/context/DemoStateContext';
import { loadSavedPushToken, registerForPush, type SavedPushToken } from '@/lib/push';
import { colors, fonts, radii, space } from '@/theme/tokens';

const STATES: { key: DemoState; label: string }[] = [
  { key: 'sample', label: 'Örnek' },
  { key: 'empty', label: 'Boş' },
  { key: 'loading', label: 'Yükleniyor' },
  { key: 'error', label: 'Hata' },
];

export default function HesapScreen() {
  const { user, orgName, configured, signOut } = useAuth();
  const { state, setState } = useDemoState();
  const catalog = useCatalog();
  const [push, setPush] = useState<SavedPushToken | null>(null);

  useEffect(() => {
    void loadSavedPushToken().then(setPush);
  }, []);

  const name = user?.name ?? 'Hesap';

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Hesap</Text>
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileMeta}>{orgName ? 'işletme sahibi' : 'işletme yok'}</Text>
            </View>
          </View>
          {orgName ? (
            <View style={styles.orgPill}>
              <Ionicons name="storefront-outline" size={14} color={colors.white} />
              <Text style={styles.orgText}>{orgName}</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet}>
          <Text style={styles.section}>İşletme</Text>
          <Row icon="business-outline" label="İşletme bilgileri" value={orgName ?? '—'} />
          <Row icon="storefront-outline" label="Mağazalarım" value="1 bağlı · Trendyol" />

          <Text style={styles.section}>Bildirim</Text>
          <Pressable
            style={styles.row}
            onPress={() => {
              void registerForPush().then(setPush);
            }}>
            <Ionicons name="notifications-outline" size={18} color={colors.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Bildirim izni</Text>
              <Text style={styles.rowHint}>
                {push?.permission === 'granted'
                  ? 'İzin verildi. Jeton kaydedildi, bildirim gönderilmez.'
                  : 'İzin iste; FCM/Expo jetonu sonra Nest’e yazılacak. Destek talebi yok.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>

          <Text style={styles.section}>Oturum</Text>
          <Text style={styles.rowHint}>
            {configured
              ? 'Firebase Auth. Nest isteklerinde Authorization: Bearer idToken.'
              : 'Firebase yapılandırılmadı.'}
          </Text>
          <Pressable
            style={styles.logout}
            onPress={() => {
              void signOut().then(() => router.replace('/(auth)/giris'));
            }}>
            <Ionicons name="log-out-outline" size={18} color="#C45C4A" />
            <Text style={styles.logoutText}>Çıkış yap</Text>
          </Pressable>

          <Text style={styles.section}>Önizleme</Text>
          <Text style={styles.rowHint}>
            {catalog.reachable
              ? `Nest ${catalog.apiMock ? 'mock' : 'canlı'} · ${catalog.apiUrl}`
              : `Nest yok · yerel örnek · ${catalog.apiUrl}`}
          </Text>
          <View style={styles.chips}>
            {STATES.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setState(item.key)}
                style={[styles.chip, state === item.key && styles.chipOn]}>
                <Text style={[styles.chipText, state === item.key && styles.chipTextOn]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.ink} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite },
  heroPad: { paddingHorizontal: space.xl, paddingBottom: 22, gap: 12 },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.white, letterSpacing: -0.8 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.graphite },
  profileName: { fontFamily: fonts.semibold, fontSize: 18, color: colors.white },
  profileMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.mutedOnDark, marginTop: 2 },
  orgPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#2A2F30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  orgText: { fontFamily: fonts.medium, fontSize: 13, color: colors.white },
  sheet: { padding: space.xl, gap: 10, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  rowLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  rowValue: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  rowHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  logoutText: { fontFamily: fonts.semibold, fontSize: 15, color: '#C45C4A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.sheetLine,
  },
  chipOn: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  chipTextOn: { color: colors.graphite },
});
