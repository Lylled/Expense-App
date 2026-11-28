import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput } from 'react-native';

import { categoryDropdownStyles as triggerStyles } from '@/components/category-dropdown.styles';
import {
  findSelectedName,
  flattenCategories,
  type CategoryDropdownProps,
} from '@/components/category-dropdown.shared';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { CategoryWithChildren } from '@/lib/categories';

type FlatOption = {
  id: string;
  label: string;
  searchText: string;
};

function flattenForSearch(categories: CategoryWithChildren[]): FlatOption[] {
  return flattenCategories(categories).map((option) => ({
    ...option,
    searchText: option.label.toLowerCase(),
  }));
}

type Row =
  | { kind: 'back' }
  | { kind: 'parent'; id: string; label: string; hasChildren: boolean }
  | { kind: 'option'; id: string; label: string };

export type CategorySearchPickerProps = CategoryDropdownProps & {
  // Overrides the trigger's label instead of deriving it from
  // selectedCategoryId - for a bulk-assign trigger ("Aseta luokka
  // valituille"), there's no single current value to show.
  triggerLabel?: string;
};

// A searchable alternative to CategoryDropdown/CategoryPicker for screens
// that show many of these side by side (e.g. one per parsed receipt line):
// it's a plain RN Modal, not a native Host, so there's no limit on how many
// can be mounted on screen at once. With the search field empty it drills
// down pääluokka -> alaluokka like CategoryDropdown does; typing a search
// switches to a flat filtered list across both levels, to jump straight to
// a known category without drilling down first.
export function CategorySearchPicker({
  categories,
  selectedCategoryId,
  onSelect,
  triggerLabel,
}: CategorySearchPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openParent, setOpenParent] = useState<CategoryWithChildren | null>(null);

  const searchOptions = useMemo(() => flattenForSearch(categories), [categories]);

  const rows: Row[] = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle) {
      return searchOptions
        .filter((option) => option.searchText.includes(needle))
        .map((option): Row => ({ kind: 'option', id: option.id, label: option.label }));
    }

    if (openParent) {
      return [
        { kind: 'back' },
        ...openParent.children.map(
          (child): Row => ({ kind: 'option', id: child.id, label: child.name })
        ),
      ];
    }

    return categories.map(
      (category): Row => ({
        kind: 'parent',
        id: category.id,
        label: category.name,
        hasChildren: category.children.length > 0,
      })
    );
  }, [categories, openParent, query, searchOptions]);

  const label = triggerLabel ?? findSelectedName(categories, selectedCategoryId) ?? 'Valitse luokka';

  function handleRowPress(row: Row) {
    if (row.kind === 'back') {
      setOpenParent(null);
      return;
    }

    if (row.kind === 'parent' && row.hasChildren) {
      const parent = categories.find((category) => category.id === row.id);
      if (parent) setOpenParent(parent);
      return;
    }

    onSelect(row.id);
    setQuery('');
    setOpenParent(null);
    setIsOpen(false);
  }

  function handleClose() {
    setQuery('');
    setOpenParent(null);
    setIsOpen(false);
  }

  return (
    <>
      <Pressable onPress={() => setIsOpen(true)} style={triggerStyles.trigger}>
        <ThemedText type="small" style={triggerStyles.triggerText}>
          {label}
        </ThemedText>
        <ThemedText type="small" style={triggerStyles.chevron}>
          ⌄
        </ThemedText>
      </Pressable>

      <Modal visible={isOpen} animationType="slide" transparent onRequestClose={handleClose}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <ThemedView type="backgroundElement" style={styles.sheet}>
          <ThemedText type="smallBold">Valitse luokka</ThemedText>
          <TextInput
            style={styles.searchInput}
            placeholder="Etsi luokka…"
            placeholderTextColor="#8A8A8E"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={rows}
            keyExtractor={(row) => (row.kind === 'back' ? 'back' : row.id)}
            style={styles.list}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary">
                Ei tuloksia.
              </ThemedText>
            }
            renderItem={({ item: row }) => (
              <Pressable onPress={() => handleRowPress(row)} style={styles.optionRow}>
                <ThemedText type="small">
                  {row.kind === 'back' ? '← Takaisin' : row.label}
                </ThemedText>
                {row.kind === 'parent' && row.hasChildren && (
                  <ThemedText type="small" themeColor="textSecondary">
                    ›
                  </ThemedText>
                )}
              </Pressable>
            )}
          />
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <ThemedText type="smallBold">Sulje</ThemedText>
          </Pressable>
        </ThemedView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  searchInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  list: {
    flexGrow: 0,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8A8A8E',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
