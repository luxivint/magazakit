import { StyleSheet, Text, View } from 'react-native';

import type { Channel } from '@/lib/api';
import { colors, fonts } from '@/theme/tokens';

const META: Record<Channel, { letter: string; color: string; label: string }> = {
  trendyol: { letter: 't', color: colors.trendyol, label: 'Trendyol' },
  hepsiburada: { letter: 'h', color: '#E31E24', label: 'Hepsiburada' },
  n11: { letter: 'n', color: '#7B1FA2', label: 'n11' },
  shopify: { letter: 's', color: '#96BF48', label: 'Shopify' },
  woocommerce: { letter: 'w', color: '#7F54B3', label: 'Woo' },
  ciceksepeti: { letter: 'ç', color: '#E91E63', label: 'Çiçeksepeti' },
  ikas: { letter: 'i', color: '#111111', label: 'ikas' },
  amazon: { letter: 'a', color: '#FF9900', label: 'Amazon' },
  pazarama: { letter: 'p', color: '#00A0E3', label: 'Pazarama' },
  ticimax: { letter: 'x', color: '#2E7D32', label: 'Ticimax' },
  ideasoft: { letter: 'd', color: '#1565C0', label: 'IdeaSoft' },
};

export function ChannelBadge({ channel = 'trendyol' }: { channel?: Channel }) {
  const meta = META[channel] ?? META.trendyol;
  return (
    <View style={styles.wrap}>
      <View style={[styles.mark, { backgroundColor: meta.color }]}>
        <Text style={styles.letter}>{meta.letter}</Text>
      </View>
      <Text style={styles.label}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 10,
    marginTop: -1,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
});

