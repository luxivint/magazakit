import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { ErrorState } from '@/components/ui/EmptyState';
import { PeachAlert } from '@/components/ui/PeachAlert';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useShops } from '@/context/ShopContext';
import { shopStatusLabel } from '@/lib/mapCatalog';
import { colors, fonts, radii, space } from '@/theme/tokens';

export default function MagazalarScreen() {
  const { orgName } = useAuth();
  const { shops, loading, error, refresh } = useShops();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>Mağazalarım</Text>
          <Text style={styles.sub}>Satış kanallarını tek yerde.</Text>
          <View style={styles.counts}>
            <Text style={styles.count}>{shops.length} bağlı mağaza</Text>
            <Text style={styles.countMuted}>{shops.length ? `${shops.length} mağaza` : '1 işlem uyarısı'}</Text>
          </View>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        {loading ? (
          <View style={styles.sheet}>
            <OrderSkeleton />
          </View>
        ) : error ? (
          <View style={styles.sheet}>
            <ErrorState
              title="Mağazalar yüklenemedi"
              body={error}
              onRetry={refresh}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.sheet}>
            <PeachAlert text="Yazma kapalı. BLOKE kanallar bağlı sayılmaz." />
            <Text style={styles.section}>Bağlı mağazalar</Text>
            {shops.length === 0 ? (
              <View style={styles.emptyCard}>
                <ChannelBadge />
                <Text style={styles.emptyTitle}>Kanal bağlı değil</Text>
                <Text style={styles.emptyBody}>
                  {orgName ?? 'İşletme'} için henüz yetkili mağaza yok.
                </Text>
              </View>
            ) : (
              shops.map((shop) => (
                <View key={shop.id} style={styles.emptyCard}>
                  <ChannelBadge channel={shop.channel} />
                  <Text style={styles.emptyTitle}>{shop.sellerLabel}</Text>
                  <Text style={styles.emptyBody}>{shopStatusLabel(shop.status, shop.statusLabel)}</Text>
                </View>
              ))
            )}
            <Button
              label="Yeni mağaza bağla"
              trailing="add"
              onPress={() => router.push('/(tabs)/magaza-bagla')}
            />
            {shops.length > 0 ? (
              <Button
                label="Ürünleri içeri al"
                variant="ghost"
                onPress={() => router.push('/(tabs)/icerik-al')}
              />
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
  counts: { flexDirection: 'row', gap: 16, marginTop: 8 },
  count: { fontFamily: fonts.semibold, fontSize: 14, color: colors.white },
  countMuted: { fontFamily: fonts.medium, fontSize: 14, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 14, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
  },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  emptyBody: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
});
