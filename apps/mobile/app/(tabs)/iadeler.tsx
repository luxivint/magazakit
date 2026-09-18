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
import { ApiError, fetchReturns, reviewReturn, type ReturnItem } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function IadelerScreen() {
  const { idToken } = useAuth();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [source, setSource] = useState<'api' | 'missing' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<ReturnItem | null>(null);
  const [note, setNote] = useState('');
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
      const page = await fetchReturns();
      setItems(page.items);
      setSource(page.source);
      setError(null);
    } catch (e) {
      setItems([]);
      setError(e instanceof ApiError ? e.message : 'İadeler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (decision: 'approve' | 'reject') => {
    if (!picked || busy) return;
    setBusy(true);
    setBanner(null);
    try {
      await reviewReturn(picked.id, { decision, note: note.trim() || undefined });
      setBanner(decision === 'approve' ? 'İade onaylandı.' : 'İade reddedildi.');
      setPicked(null);
      await load();
    } catch (e) {
      setBanner(e instanceof ApiError ? e.message : 'İnceleme tamamlanmış sayılmaz.');
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
          <Text style={styles.title}>İadeler</Text>
          <Text style={styles.sub}>Liste ve inceleme. Onay uydurulmaz.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
            <OrderSkeleton />
          </View>
        ) : error ? (
          <ErrorState title="İadeler yüklenemedi" body={error} onRetry={() => void load()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Henüz iade yok"
            body={
              source === 'missing'
                ? 'Sunucuda iade listesi henüz yok. Boş liste hata değildir.'
                : 'İade geldiğinde burada incelenir. Boş liste hata değildir.'
            }
            primary="Yenile"
            onPrimary={() => void load()}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            {banner ? <ConfigBanner text={banner} /> : null}
            {items.map((item) => (
              <Pressable key={item.id} style={styles.card} onPress={() => setPicked(item)}>
                <Text style={styles.name}>{item.orderNumber ?? item.id}</Text>
                <Text style={styles.meta}>
                  {item.customerName ?? 'Müşteri'} · {item.statusLabel ?? item.status ?? 'Bekliyor'}
                </Text>
              </Pressable>
            ))}
            {picked ? (
              <View style={styles.card}>
                <Text style={styles.section}>İncele · {picked.orderNumber ?? picked.id}</Text>
                <Text style={styles.meta}>{picked.reason ?? 'Gerekçe yok'}</Text>
                <TextField label="Not" value={note} onChangeText={setNote} placeholder="Depo notu" />
                <Button label="Onayla" variant="lime" loading={busy} onPress={() => void decide('approve')} />
                <Button label="Reddet" variant="ghost" disabled={busy} onPress={() => void decide('reject')} />
              </View>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
  },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  section: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
});
