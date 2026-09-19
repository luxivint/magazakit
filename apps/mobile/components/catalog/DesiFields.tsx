import { StyleSheet, Text, View } from 'react-native';

import { TextField } from '@/components/ui/TextField';
import { colors, fonts } from '@/theme/tokens';

export type DesiValues = {
  weightKg: string;
  widthCm: string;
  heightCm: string;
  lengthCm: string;
};

export function parseDim(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function volumetricDesi(values: DesiValues): number | null {
  const w = parseDim(values.widthCm);
  const h = parseDim(values.heightCm);
  const l = parseDim(values.lengthCm);
  if (!w || !h || !l) return null;
  return Math.round(((w * h * l) / 3000) * 100) / 100;
}

export function DesiFields({
  values,
  onChange,
}: {
  values: DesiValues;
  onChange: (next: DesiValues) => void;
}) {
  const set = (key: keyof DesiValues) => (text: string) => onChange({ ...values, [key]: text });
  const vol = volumetricDesi(values);
  const kg = parseDim(values.weightKg);
  const billed = vol || kg ? Math.max(1, Math.ceil(Math.max(vol ?? 0, kg ?? 0))) : null;
  return (
    <View style={styles.wrap}>
      <TextField label="Ağırlık (kg)" value={values.weightKg} onChangeText={set('weightKg')} keyboardType="decimal-pad" />
      <TextField label="En (cm)" value={values.widthCm} onChangeText={set('widthCm')} keyboardType="decimal-pad" />
      <TextField label="Boy (cm)" value={values.lengthCm} onChangeText={set('lengthCm')} keyboardType="decimal-pad" />
      <TextField label="Yükseklik (cm)" value={values.heightCm} onChangeText={set('heightCm')} keyboardType="decimal-pad" />
      <Text style={styles.hint}>
        {vol != null
          ? `Hacimsel desi ${vol} · faturalanan ${billed} (max hacim/kg, yukarı). Trendyol desi varsa o öncelikli.`
          : 'Desi: en × boy × yükseklik / 3000, faturalanan = max(hacim, kg).'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 17 },
});
