import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { usePersistedChoice } from '@/hooks/use-persisted-choice';
import { useTheme } from '@/hooks/use-theme';
import {
  RECEIPT_STORAGE_LABELS,
  RECEIPT_STORAGE_MODES,
  RECEIPT_STORAGE_STORAGE_KEY,
  type ReceiptStorageMode,
} from '@/lib/receipt-storage';

export default function SettingsReceiptsScreen() {
  const theme = useTheme();
  const [receiptStorageMode, setReceiptStorageMode] = usePersistedChoice(
    RECEIPT_STORAGE_STORAGE_KEY,
    RECEIPT_STORAGE_MODES,
    'none'
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={Spacing.two}>
          <ThemedText type="link">Sulje</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          Kuittikuvat
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Minne kuitista otettu kuva tallennetaan kuvauksen jälkeen.
          </ThemedText>
          <View style={styles.chipRow}>
            {(Object.keys(RECEIPT_STORAGE_LABELS) as ReceiptStorageMode[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => setReceiptStorageMode(option)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      receiptStorageMode === option ? theme.backgroundSelected : theme.background,
                  },
                ]}>
                <ThemedText type="small">{RECEIPT_STORAGE_LABELS[option]}</ThemedText>
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
