import { Alert, Pressable } from 'react-native';

import { categoryActionMenuStyles as styles } from '@/components/category-action-menu.styles';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type CategoryActionMenuProps = {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
};

// Fallback for platforms other than Android (iOS, web): a native alert
// with the actions as buttons. See category-action-menu.android.tsx for
// the anchored dropdown-menu version used on Android.
export function CategoryActionMenu({ label, onEdit, onDelete }: CategoryActionMenuProps) {
  function openMenu() {
    Alert.alert(label, undefined, [
      { text: 'Muokkaa', onPress: onEdit },
      { text: 'Poista', style: 'destructive', onPress: onDelete },
      { text: 'Peruuta', style: 'cancel' },
    ]);
  }

  return (
    <Pressable onPress={openMenu} hitSlop={Spacing.two} style={styles.menuButton}>
      <ThemedText type="smallBold" style={styles.menuDots}>
        ⋯
      </ThemedText>
    </Pressable>
  );
}
