import { Redirect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { ready, user, orgName } = useAuth();
  if (!ready) return null;
  if (!user) return <Redirect href="/(auth)/giris" />;
  if (!orgName) return <Redirect href="/(auth)/isletme" />;
  return <Redirect href="/(tabs)" />;
}
