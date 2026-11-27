import { DropdownMenu, DropdownMenuItem, Host, Text as ComposeText } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Pressable } from 'react-native';

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

const BACK_ITEM_ID = '__back__';

// A single native anchored dropdown menu (Jetpack Compose) that drills down
// from pääluokka into alaluokka in place, instead of mounting a second
// Host/DropdownMenu next to this one - two sibling Hosts turned out to be
// unreliable to touch input on Android.
export function CategoryDropdown({ categories, selectedCategoryId, onSelect }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openParent, setOpenParent] = useState<CategoryWithChildren | null>(null);

  const label = findSelectedName(categories, selectedCategoryId) ?? 'Valitse luokka';

  const items = openParent
    ? [{ id: BACK_ITEM_ID, label: '← Takaisin' }, ...openParent.children.map((c) => ({ id: c.id, label: c.name }))]
    : categories.map((category) => ({ id: category.id, label: category.name }));

  function handleItemClick(id: string) {
    if (id === BACK_ITEM_ID) {
      setOpenParent(null);
      return;
    }

    if (!openParent) {
      const parent = categories.find((category) => category.id === id);
      if (parent && parent.children.length > 0) {
        setOpenParent(parent);
        return;
      }
    }

    setIsOpen(false);
    setOpenParent(null);
    onSelect(id);
  }

  return (
    <Host matchContents>
      <DropdownMenu
        expanded={isOpen}
        onDismissRequest={() => {
          setIsOpen(false);
          setOpenParent(null);
        }}>
        <DropdownMenu.Trigger>
          <Pressable onPress={() => setIsOpen(true)} style={styles.trigger}>
            <ThemedText type="small" style={styles.triggerText}>
              {label}
            </ThemedText>
            <ThemedText type="small" style={styles.chevron}>
              ⌄
            </ThemedText>
          </Pressable>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {items.map((item) => (
            <DropdownMenuItem key={item.id} onClick={() => handleItemClick(item.id)}>
              <DropdownMenuItem.Text>
                <ComposeText>{item.label}</ComposeText>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
