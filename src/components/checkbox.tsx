import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
};

export function Checkbox({ checked, onToggle }: CheckboxProps) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={Spacing.two}
      style={[styles.box, checked && styles.boxChecked]}>
      {checked && <ThemedText style={styles.mark}>✓</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: Spacing.one,
    borderWidth: 2,
    borderColor: '#8A8A8E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: '#208AEF',
    borderColor: '#208AEF',
  },
  mark: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 16,
  },
});
