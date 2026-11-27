import { Alert, Pressable } from 'react-native';

import { optionDropdownStyles as styles } from '@/components/option-dropdown.styles';
import { ThemedText } from '@/components/themed-text';

export type DropdownOption = {
  id: string;
  label: string;
};

export type OptionDropdownProps = {
  title: string;
  label: string;
  options: DropdownOption[];
  onSelect: (id: string) => void;
};

// Fallback for platforms other than Android (iOS, web): a native alert
// listing the options as buttons. See option-dropdown.android.tsx for the
// anchored dropdown-menu version used on Android.
export function OptionDropdown({ title, label, options, onSelect }: OptionDropdownProps) {
  function openMenu() {
    Alert.alert(title, undefined, [
      ...options.map((option) => ({ text: option.label, onPress: () => onSelect(option.id) })),
      { text: 'Peruuta', style: 'cancel' as const },
    ]);
  }

  return (
    <Pressable onPress={openMenu} style={styles.trigger}>
      <ThemedText type="small" style={styles.triggerText}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.chevron}>
        ⌄
      </ThemedText>
    </Pressable>
  );
}
