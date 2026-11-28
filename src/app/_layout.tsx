import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import type { PropsWithChildren } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ThemePreferenceProvider, useThemePreference } from '@/hooks/use-theme-preference';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="receipt-scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="category-expenses" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings-profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings-theme" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings-receipts" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

function NavigationTheme({ children }: PropsWithChildren) {
  const { colorScheme } = useThemePreference();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>{children}</ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <AuthProvider>
        <NavigationTheme>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </NavigationTheme>
      </AuthProvider>
    </ThemePreferenceProvider>
  );
}
