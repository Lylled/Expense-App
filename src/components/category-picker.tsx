import { Alert, Pressable } from 'react-native';

import { categoryDropdownStyles as styles } from '@/components/category-dropdown.styles';
import { findSelectedName, type CategoryDropdownProps } from '@/components/category-dropdown.shared';
import { ThemedText } from '@/components/themed-text';
import type { CategoryWithChildren } from '@/lib/categories';

// A chain of native alerts drilling from pääluokka into alaluokka, used
// (on every platform, including Android) wherever a screen can show many
// of these side by side - e.g. one per parsed receipt line. The anchored
// Jetpack Compose dropdown in category-dropdown.android.tsx is reliable as
// a single instance (see the Menot form), but stopped responding to touch
// once more than a few were mounted on screen at once. Alert.alert has no
// such limit, so this is the safer choice whenever there can be many.
export function CategoryPicker({ categories, selectedCategoryId, onSelect }: CategoryDropdownProps) {
  function openParentMenu() {
    Alert.alert('Valitse pääluokka', undefined, [
      ...categories.map((category) => ({
        text: category.name,
        onPress: () => {
          if (category.children.length === 0) {
            onSelect(category.id);
          } else {
            openChildMenu(category);
          }
        },
      })),
      { text: 'Peruuta', style: 'cancel' as const },
    ]);
  }

  function openChildMenu(parent: CategoryWithChildren) {
    Alert.alert(parent.name, undefined, [
      ...parent.children.map((child) => ({
        text: child.name,
        onPress: () => onSelect(child.id),
      })),
      { text: '← Takaisin', onPress: openParentMenu },
      { text: 'Peruuta', style: 'cancel' as const },
    ]);
  }

  const label = findSelectedName(categories, selectedCategoryId) ?? 'Valitse luokka';

  return (
    <Pressable onPress={openParentMenu} style={styles.trigger}>
      <ThemedText type="small" style={styles.triggerText}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.chevron}>
        ⌄
      </ThemedText>
    </Pressable>
  );
}
