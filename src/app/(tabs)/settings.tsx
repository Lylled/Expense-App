import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

const SETTINGS_LINKS: { pathname: '/settings-profile' | '/settings-theme' | '/settings-receipts'; label: string }[] = [
  { pathname: '/settings-profile', label: 'Profiili' },
  { pathname: '/settings-theme', label: 'Teema' },
  { pathname: '/settings-receipts', label: 'Kuittikuvat' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            Asetukset
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Tili</ThemedText>
            {session?.user.email && (
              <ThemedText type="small" themeColor="textSecondary">
                {session.user.email}
              </ThemedText>
            )}
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundSelected }]}
              onPress={() => signOut()}>
              <ThemedText type="smallBold">Kirjaudu ulos</ThemedText>
            </Pressable>
          </ThemedView>

          <View style={styles.linkList}>
            {SETTINGS_LINKS.map((link) => (
              <Pressable
                key={link.pathname}
                onPress={() => router.push(link.pathname)}
                style={({ pressed }) => [
                  styles.linkRowWrapper,
                  pressed && styles.linkRowWrapperPressed,
                ]}>
                <ThemedView type="backgroundElement" style={styles.linkRow}>
                  <ThemedText type="small">{link.label}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    ›
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  title: {
    textAlign: 'center',
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  linkList: {
    gap: Spacing.two,
  },
  linkRowWrapper: {
    borderRadius: Spacing.three,
  },
  linkRowWrapperPressed: {
    opacity: 0.7,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
});
