import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function AuthForm({ children }: PropsWithChildren) {
  return (
    <ThemedView type="backgroundElement" style={styles.form}>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  form: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
