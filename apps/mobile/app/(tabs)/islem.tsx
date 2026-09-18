import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { ApiError, fetchOperations, type OperationItem } from '@/lib/apiClient';
import { colors, fonts, radii, space } from '@/theme/tokens';

function typeTr(type: string): string {
  switch (type) {
    case 'reserve':
      return 'Rezerve';
    case 'pack_scan':
      return 'Paket';
    case 'label':
      return 'Etiket';
    case 'ship':
      return 'Kargo';
    case 'channel_stock_write':
      return 'Kanal stok';
    default:
      return 'İşlem';
  }
}

function statusTr(status: OperationItem['status']): string {
  switch (status) {
    case 'ok':
      return 'Tamam';
    case 'pending':
      return 'İşlemde';
    case 'reconciling':
      return 'Mutabakat';
    case 'unknown':
      return 'Bilinmiyor';
    case 'error':
      return 'Hata';
    default:
      return 'Başarısız';
  }
}

export default function IslemScreen() {
  const { idToken } = useAuth();
  const [items, setItems] = useState<OperationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idToken) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const page = await fetchOperations();
      setItems(page.items);
      setError(null);
    } catch (e) {
      setItems([]);
      setError(e instanceof ApiError ? e.message : 'İşlemler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>İşlem merkezi</Text>
          <Text style={styles.sub}>Bekleyen işlem başarısız değildir.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
            <OrderSkeleton />
          </View>
        ) : error ? (
          <ErrorState title="İşlemler yüklenemedi" body={error} onRetry={() => void load()} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Henüz işlem yok"
            body="Rezervasyon, stok ve etiket burada deftere yazılır. Boş liste hata değildir."
            primary="Yenile"
            onPrimary={() => void load()}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            {items.map((op) => (
              <View key={op.id} style={styles.card}>
                <Text style={styles.name}>{op.title}</Text>
                <Text style={styles.meta}>
                  {typeTr(op.type)} · {statusTr(op.status)} ·{' '}
                  {new Date(op.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {op.status === 'unknown' || op.status === 'reconciling' || op.status === 'pending' ? (
                  <Text style={styles.hint}>Beklemede — henüz başarısız değil.</Text>
                ) : null}
              </View>
            ))}
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
    gap: 4,
  },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  hint: { fontFamily: fonts.medium, fontSize: 12, color: colors.peachText },
});
