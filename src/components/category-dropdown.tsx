import { Alert, Pressable } from 'react-native';

import { categoryDropdownStyles as styles } from '@/components/category-dropdown.styles';
import { ThemedText } from '@/components/themed-text';
import type { CategoryWithChildren } from '@/lib/categories';

export type CategoryDropdownProps = {
  categories: CategoryWithChildren[];
  selectedCategoryId: string | null;
  onSelect: (id: string) => void;
};

function findSelectedName(categories: CategoryWithChildren[], selectedCategoryId: string | null) {
  if (!selectedCategoryId) return null;
  for (const category of categories) {
    if (category.id === selectedCategoryId) return category.name;
    const child = category.children.find((c) => c.id === selectedCategoryId);
    if (child) return child.name;
  }
  return null;
}

// Fallback for platforms other than Android (iOS, web): a chain of native
// alerts drilling from pääluokka into alaluokka. See
// category-dropdown.android.tsx for the single anchored dropdown-menu
// version used on Android.
export function CategoryDropdown({ categories, selectedCategoryId, onSelect }: CategoryDropdownProps) {
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
