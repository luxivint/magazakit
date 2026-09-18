import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PorcelainSheet } from '@/components/shell/PorcelainSheet';
import { StoreBar } from '@/components/shell/StoreBar';
import { Button } from '@/components/ui/Button';
import { ConfigBanner } from '@/components/ui/ConfigBanner';
import { TextField } from '@/components/ui/TextField';
import { colors, fonts, space } from '@/theme/tokens';

export default function IkiFaktorScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [note, setNote] = useState<string | null>(null);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <StoreBar />
        <View style={styles.heroPad}>
          <Text style={styles.title}>İki adımlı doğrulama</Text>
          <Text style={styles.sub}>İsteğe bağlı. SMS henüz bağlanmadı.</Text>
        </View>
      </SafeAreaView>
      <PorcelainSheet>
        <ScrollView contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled">
          {note ? <ConfigBanner text={note} /> : null}
          <TextField
            label="Telefon"
            value={phone}
            onChangeText={setPhone}
            placeholder="05xx"
            keyboardType="phone-pad"
          />
          <TextField
            label="Kod"
            value={code}
            onChangeText={setCode}
            placeholder="6 haneli kod"
            keyboardType="number-pad"
          />
          <Button
            label="Kaydet"
            onPress={() => setNote('2FA kaydı tamamlanmış sayılmaz. Sunucu henüz bu adımı açmadı.')}
          />
          <Button label="Şimdilik geç" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
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
});
