import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/ChannelBadge';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/context/AuthContext';
import { useShops } from '@/context/ShopContext';
import type { Channel, ChannelCatalogRow, ShopConnectRequest } from '@/lib/api';
import { ApiError, fetchChannels } from '@/lib/apiClient';
import { shopStatusLabel } from '@/lib/mapCatalog';
import { colors, fonts, radii, space } from '@/theme/tokens';

type Field = { key: keyof ShopConnectRequest; label: string; placeholder: string; secure?: boolean };

const FIELDS: Partial<Record<Channel, Field[]>> = {
  trendyol: [
    { key: 'sellerId', label: 'Satıcı ID', placeholder: 'Trendyol sellerId' },
    { key: 'apiKey', label: 'API key', placeholder: 'Sunucuya bir kez gider', secure: true },
    { key: 'apiSecret', label: 'API secret', placeholder: 'Telefonda saklanmaz', secure: true },
  ],
  hepsiburada: [
    { key: 'merchantId', label: 'Merchant ID', placeholder: 'merchantId' },
    { key: 'apiKey', label: 'API key', placeholder: 'Basic kullanıcı', secure: true },
    { key: 'apiSecret', label: 'API secret', placeholder: 'Basic parola', secure: true },
  ],
  n11: [
    { key: 'appKey', label: 'appKey', placeholder: 'n11 appKey', secure: true },
    { key: 'appSecret', label: 'appSecret', placeholder: 'n11 appSecret', secure: true },
  ],
  shopify: [
    { key: 'shopDomain', label: 'Mağaza', placeholder: 'magaza.myshopify.com' },
    { key: 'accessToken', label: 'Admin token', placeholder: 'shpat_…', secure: true },
  ],
  woocommerce: [
    { key: 'host', label: 'Mağaza HTTPS', placeholder: 'https://ornek.com' },
    { key: 'consumerKey', label: 'Consumer key', placeholder: 'ck_…', secure: true },
    { key: 'consumerSecret', label: 'Consumer secret', placeholder: 'cs_…', secure: true },
  ],
  ciceksepeti: [{ key: 'apiKey', label: 'API key', placeholder: 'x-api-key', secure: true }],
  ikas: [
    { key: 'clientId', label: 'client_id', placeholder: 'ikas private app', secure: true },
    { key: 'clientSecret', label: 'client_secret', placeholder: 'ikas secret', secure: true },
  ],
  amazon: [
    { key: 'clientId', label: 'LWA client id', placeholder: 'amzn1.application…', secure: true },
    { key: 'clientSecret', label: 'LWA secret', placeholder: 'LWA secret', secure: true },
    { key: 'refreshToken', label: 'Refresh token', placeholder: 'Atzr|…', secure: true },
    { key: 'sellerId', label: 'Seller ID (ürünler)', placeholder: 'isteğe bağlı' },
  ],
};

export default function MagazaBaglaScreen() {
  const { orgName } = useAuth();
  const { connectChannel } = useShops();
  const [storeName, setStoreName] = useState(orgName ?? '');
  const [values, setValues] = useState<ShopConnectRequest>({});
  const [catalog, setCatalog] = useState<ChannelCatalogRow[]>([]);
  const [channel, setChannel] = useState<Channel>('trendyol');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    void fetchChannels()
      .then((page) => setCatalog(page.items))
      .catch(() => setCatalog([]));
  }, []);

  const selected = catalog.find((c) => c.channel === channel);
  const blocked = selected?.mode === 'blocked';
  const fields = useMemo(() => FIELDS[channel] ?? [], [channel]);

  const test = async () => {
    setBusy(true);
    setResult(null);
    try {
      const shop = await connectChannel(channel, values);
      setValues({});
      setResult(`${shopStatusLabel(shop.status, shop.statusLabel)}. Anahtar telefonda tutulmadı.`);
    } catch (e) {
      setResult(e instanceof ApiError ? e.message : 'Bağlantı denendi sayılmaz.');
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
        <BrandMark />
        <Text style={styles.headline}>Mağazanı bağla</Text>
        <Text style={styles.lead}>Anahtar bir kez API’ye gider, org mağazasında şifrelenir. Telefonda ve .env’de durmaz.</Text>
        <View style={styles.steps}>
          <Text style={styles.stepMuted}>1 İşletme</Text>
          <Text style={styles.stepOn}>2 Mağaza</Text>
          <Text style={styles.stepMuted}>3 Ürünler</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Pazaryeri seç</Text>
          {catalog.length === 0 ? (
            <Text style={styles.hint}>Kanallar yüklenemedi. API /v1/channels açık olmalı.</Text>
          ) : (
            catalog.map((row) => {
              const on = row.channel === channel;
              return (
                <Pressable
                  key={row.channel}
                  style={[styles.channelOn, on && styles.channelSelected]}
                  onPress={() => {
                    setChannel(row.channel);
                    setValues({});
                    setResult(null);
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <ChannelBadge channel={row.channel} />
                    <Text style={styles.hint}>
                      {row.mode === 'mock'
                        ? 'Anahtarsız test okuma (Trendyol mock)'
                        : row.note}
                    </Text>
                  </View>
                  {on ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : null}
                </Pressable>
              );
            })
          )}
          <TextField
            label="Mağaza adı"
            placeholder="Ayşe Home"
            value={storeName}
            onChangeText={setStoreName}
            autoCapitalize="words"
          />
          {channel === 'trendyol' ? (
            <Text style={styles.hint}>Boş bırakırsan mock bağlanır. Canlı için üç alan da gerekir; biri doluysa üçünü de doldur. Anahtarlar yalnızca HTTPS veya 127.0.0.1 API’ye gider.</Text>
          ) : null}
          {fields.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              value={String(values[field.key] ?? '')}
              onChangeText={(text) => setValues((prev) => ({ ...prev, [field.key]: text }))}
              secureTextEntry={field.secure}
              autoCapitalize="none"
            />
          ))}
          {result ? <ConfigBanner text={result} /> : null}
          {result && !result.includes('sayılmaz') && !result.includes('yok') && !result.includes('gerekli') ? (
            <Button label="Ürünleri içeri al" variant="ghost" onPress={() => router.push('/(tabs)/icerik-al')} />
          ) : null}
          <Button
            label={blocked ? 'Durumu dene (bağlı sayılmaz)' : 'Bağlantıyı test et'}
            icon="link-outline"
            trailing="arrow-forward"
            onPress={() => void test()}
            loading={busy}
          />
          <Pressable onPress={() => router.replace('/(tabs)/magazalar')}>
            <Text style={styles.skip}>Daha sonra bağla</Text>
          </Pressable>
        </ScrollView>
      </PorcelainSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.graphite },
  hero: { backgroundColor: colors.graphite, paddingHorizontal: space.xl, paddingBottom: 22, paddingTop: 8 },
  back: { width: 36, height: 36, justifyContent: 'center', marginBottom: 8 },
  headline: { marginTop: 8, fontFamily: fonts.bold, fontSize: 26, color: colors.white, letterSpacing: -0.5 },
  lead: { marginTop: 6, fontFamily: fonts.regular, fontSize: 14, color: colors.mutedOnDark },
  steps: { flexDirection: 'row', gap: 14, marginTop: 14 },
  stepOn: { fontFamily: fonts.semibold, fontSize: 13, color: colors.lime },
  stepMuted: { fontFamily: fonts.medium, fontSize: 13, color: colors.mutedOnDark },
  sheet: { padding: space.xl, gap: 12, paddingBottom: 40 },
  section: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  channelOn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.sheetLine,
    gap: 8,
  },
  channelSelected: { borderColor: colors.success },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: -4 },
  skip: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 13, color: colors.muted, paddingVertical: 8 },
});
