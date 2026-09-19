import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { ProductThumbKind } from '@/data/mock';
import { colors, radii } from '@/theme/tokens';

const BG: Record<ProductThumbKind, string> = {
  mug: '#E8D7C4',
  towel: '#EEE6DC',
  thermos: '#D8DDE2',
  lamp: '#E4E0D4',
};

export function ProductThumb({
  kind = 'mug',
  uri,
  size = 52,
}: {
  kind?: ProductThumbKind;
  uri?: string | null;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel="Ürün görseli"
        style={{
          width: size,
          height: size,
          borderRadius: radii.thumb,
          backgroundColor: colors.skeleton,
        }}
      />
    );
  }
  return (
    <View style={[styles.box, { width: size, height: size, backgroundColor: BG[kind] }]}>
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32">
        {kind === 'mug' ? (
          <>
            <Rect x="6" y="8" width="14" height="16" rx="3" fill="#C4A484" />
            <Path d="M20 12 h4 a4 4 0 0 1 0 8 h-4" stroke="#C4A484" strokeWidth="2" fill="none" />
          </>
        ) : null}
        {kind === 'towel' ? (
          <Rect x="6" y="8" width="20" height="16" rx="3" fill="#F7F4EF" stroke="#D2C4B4" strokeWidth="1.4" />
        ) : null}
        {kind === 'thermos' ? (
          <>
            <Rect x="11" y="4" width="10" height="4" rx="1" fill="#8A93A0" />
            <Rect x="10" y="8" width="12" height="18" rx="5" fill="#9AA3AE" />
          </>
        ) : null}
        {kind === 'lamp' ? (
          <>
            <Path d="M8 14 L16 6 L24 14 Z" fill="#C9B48A" />
            <Rect x="15" y="14" width="2" height="10" fill="#8A7A5A" />
            <Circle cx="16" cy="12" r="3" fill="#F3E6C4" />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.thumb,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
