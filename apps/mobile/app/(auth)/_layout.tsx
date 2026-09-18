import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/tokens';

export default function AuthLayout() {
  const { ready, user, orgName } = useAuth();
  if (!ready) return null;
  if (user && orgName) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.graphite },
        animation: 'fade',
      }}
    />
  );
}
