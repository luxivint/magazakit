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
import { useShops } from '@/context/ShopContext';
import type { Channel, ChannelCatalogRow, ShopConnectRequest } from '@/lib/api';
import { ApiError, fetchChannels } from '@/lib/apiClient';
import { shopStatusLabel } from '@/lib/mapCatalog';
import { colors, fonts, radii, space } from '@/theme/tokens';

type Field = { key: keyof ShopConnectRequest; label: string; placeholder: string; secure?: boolean };

const FIELDS: Partial<Record<Channel, Field[]>> = {
  trendyol: [
    { key: 'sellerId', label: 'Satıcı ID (Cari ID)', placeholder: 'Satıcı ID' },
    { key: 'apiKey', label: 'API Key', placeholder: 'API Key', secure: true },
    { key: 'apiSecret', label: 'API Secret', placeholder: 'API Secret', secure: true },
  ],
  hepsiburada: [
    { key: 'merchantId', label: 'Merchant ID', placeholder: 'Merchant ID' },
    { key: 'apiKey', label: 'API Key', placeholder: 'API Key', secure: true },
    { key: 'apiSecret', label: 'API Secret', placeholder: 'API Secret', secure: true },
  ],
  n11: [
    { key: 'appKey', label: 'appKey', placeholder: 'appKey', secure: true },
    { key: 'appSecret', label: 'appSecret', placeholder: 'appSecret', secure: true },
  ],
  shopify: [
    { key: 'shopDomain', label: 'Mağaza', placeholder: 'magaza.myshopify.com' },
    { key: 'accessToken', label: 'Admin token', placeholder: 'shpat_…', secure: true },
  ],
  woocommerce: [
    { key: 'host', label: 'Mağaza adresi', placeholder: 'https://ornek.com' },
    { key: 'consumerKey', label: 'Consumer key', placeholder: 'ck_…', secure: true },
    { key: 'consumerSecret', label: 'Consumer secret', placeholder: 'cs_…', secure: true },
  ],
  ciceksepeti: [{ key: 'apiKey', label: 'API Key', placeholder: 'API Key', secure: true }],
  ikas: [
    { key: 'clientId', label: 'client_id', placeholder: 'client_id', secure: true },
    { key: 'clientSecret', label: 'client_secret', placeholder: 'client_secret', secure: true },
  ],
  amazon: [
    { key: 'clientId', label: 'LWA client id', placeholder: 'LWA client id', secure: true },
    { key: 'clientSecret', label: 'LWA secret', placeholder: 'LWA secret', secure: true },
    { key: 'refreshToken', label: 'Refresh token', placeholder: 'Refresh token', secure: true },
    { key: 'sellerId', label: 'Seller ID', placeholder: 'Ürün listesi için' },
  ],
};

export default function MagazaBaglaScreen() {
  const { connectChannel } = useShops();
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
      setResult(shopStatusLabel(shop.status, shop.statusLabel));
    } catch (e) {
      setResult(e instanceof ApiError ? e.message : 'Bağlanamadı.');
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
        {channel === 'trendyol' ? (
          <Text style={styles.lead}>Paneldeki Satıcı ID, API Key ve API Secret. Diğer satırlar API’ye gitmez.</Text>
        ) : (
          <Text style={styles.lead}>Anahtar bir kez sunucuya yazılır.</Text>
        )}
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          <Text style={styles.section}>Pazaryeri</Text>
          {catalog.length === 0 ? (
            <Text style={styles.hint}>Kanallar yüklenemedi.</Text>
          ) : (
            catalog.map((row) => {
              const on = row.channel === channel;
              const closed = row.mode === 'blocked';
              return (
                <Pressable
                  key={row.channel}
                  style={[styles.channelOn, on && styles.channelSelected, closed && styles.channelBlocked]}
                  onPress={() => {
                    setChannel(row.channel);
                    setValues({});
                    setResult(null);
                  }}
                >
                  <ChannelBadge channel={row.channel} />
                  {closed ? <Text style={styles.blocked}>Kapalı</Text> : null}
                  {on && !closed ? <Ionicons name="checkmark-circle" size={22} color={colors.success} /> : null}
                </Pressable>
              );
            })
          )}
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
          <Button
            label={blocked ? 'Bu kanal kapalı' : 'Bağla'}
            icon="link-outline"
            trailing="arrow-forward"
            onPress={() => void test()}
            loading={busy}
            disabled={blocked}
          />
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
  channelBlocked: { opacity: 0.55 },
  blocked: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
});
