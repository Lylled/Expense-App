import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference, type ThemePreference } from '@/hooks/use-theme-preference';

const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: 'Vaalea',
  dark: 'Tumma',
  system: 'Järjestelmä',
};

export default function SettingsThemeScreen() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={Spacing.two}>
          <ThemedText type="link">Sulje</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          Teema
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.section}>
          <View style={styles.chipRow}>
            {(Object.keys(THEME_PREFERENCE_LABELS) as ThemePreference[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => setPreference(option)}
                style={[
                  styles.chip,
                  { backgroundColor: preference === option ? theme.backgroundSelected : theme.background },
                ]}>
                <ThemedText type="small">{THEME_PREFERENCE_LABELS[option]}</ThemedText>
              </Pressable>
            ))}
          </View>
        </ThemedView>
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
    gap: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  title: {
    textAlign: 'center',
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
