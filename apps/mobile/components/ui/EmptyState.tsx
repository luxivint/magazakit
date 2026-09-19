import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import { Button } from './Button';

export function EmptyState({
  title,
  body,
  primary,
  secondary,
  onPrimary,
  onSecondary,
}: {
  title: string;
  body: string;
  primary?: string;
  secondary?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.art}>
        <Svg width={88} height={72} viewBox="0 0 88 72">
          <Rect x="18" y="22" width="52" height="36" rx="6" stroke={colors.ink} strokeWidth="1.6" fill="none" />
          <Path d="M18 30 h52" stroke={colors.ink} strokeWidth="1.6" />
          <Path d="M34 22 v-8 h20 v8" stroke={colors.ink} strokeWidth="1.6" fill="none" />
          <Path d="M40 42 h8" stroke={colors.ink} strokeWidth="1.6" />
        </Svg>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {primary && onPrimary ? <Button label={primary} onPress={onPrimary} icon="refresh" /> : null}
      {secondary && onSecondary ? (
        <Button label={secondary} onPress={onSecondary} variant="ghost" />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.art}>
        <Ionicons name="cloud-offline-outline" size={42} color={colors.ink} />
        <View style={styles.bang}>
          <Text style={styles.bangText}>!</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Button label="Yeniden dene" onPress={onRetry} icon="refresh" />
      <Button label="Destek al" variant="ghost" onPress={() => router.push('/(tabs)/yardim')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
    gap: 10,
  },
  art: {
    width: 108,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  bang: {
    position: 'absolute',
    right: 22,
    top: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bangText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.errorInk,
  },
});
