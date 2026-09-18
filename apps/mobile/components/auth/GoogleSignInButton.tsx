import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { googleWebClientId } from '@/lib/firebaseConfig';

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignInButton({ disabled }: { disabled?: boolean }) {
  const { signInGoogle, configured } = useAuth();
  const webClientId = googleWebClientId();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId ?? '000000000000-placeholder.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token;
    if (idToken) void signInGoogle(idToken);
  }, [response, signInGoogle]);

  const onPress = () => {
    if (Platform.OS === 'web' && configured) {
      void signInGoogle();
      return;
    }
    void promptAsync();
  };

  return (
    <Button
      label="Google ile devam et"
      variant="ghost"
      icon={'logo-google' as keyof typeof Ionicons.glyphMap}
      onPress={onPress}
      disabled={disabled || !configured || (!webClientId && Platform.OS !== 'web') || (!request && Platform.OS !== 'web')}
    />
  );
}
