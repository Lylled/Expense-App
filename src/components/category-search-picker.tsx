import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput } from 'react-native';

import { categoryDropdownStyles as triggerStyles } from '@/components/category-dropdown.styles';
import { findSelectedName, type CategoryDropdownProps } from '@/components/category-dropdown.shared';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type FlatOption = {
  id: string;
  label: string;
  searchText: string;
};

function flattenForSearch(categories: CategoryDropdownProps['categories']): FlatOption[] {
  const options: FlatOption[] = [];
  for (const category of categories) {
    options.push({
      id: category.id,
      label: category.name,
      searchText: category.name.toLowerCase(),
    });
    for (const child of category.children) {
      options.push({
        id: child.id,
        label: `${category.name} › ${child.name}`,
        searchText: `${category.name} ${child.name}`.toLowerCase(),
      });
    }
  }
  return options;
}

// A searchable alternative to CategoryDropdown/CategoryPicker for screens
// that show many of these side by side (e.g. one per parsed receipt line):
// it's a plain RN Modal, not a native Host, so there's no limit on how many
// can be mounted on screen at once, and it adds a search field to narrow
// down a long category list.
export function CategorySearchPicker({ categories, selectedCategoryId, onSelect }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = useMemo(() => flattenForSearch(categories), [categories]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.searchText.includes(needle)) : options;
  }, [options, query]);

  const label = findSelectedName(categories, selectedCategoryId) ?? 'Valitse luokka';

  function handleSelect(id: string) {
    onSelect(id);
    setQuery('');
    setIsOpen(false);
  }

  function handleClose() {
    setQuery('');
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
            data={filtered}
            keyExtractor={(option) => option.id}
            style={styles.list}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary">
                Ei tuloksia.
              </ThemedText>
            }
            renderItem={({ item: option }) => (
              <Pressable onPress={() => handleSelect(option.id)} style={styles.optionRow}>
                <ThemedText type="small">{option.label}</ThemedText>
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
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8A8A8E',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
