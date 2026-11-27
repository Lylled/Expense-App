import { DropdownMenu, DropdownMenuItem, Host, Text as ComposeText } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { categoryDropdownStyles as styles } from '@/components/category-dropdown.styles';
import { findSelectedName, type CategoryDropdownProps } from '@/components/category-dropdown.shared';
import { ThemedText } from '@/components/themed-text';
import type { CategoryWithChildren } from '@/lib/categories';

type MenuItem = { kind: 'back' } | { kind: 'category'; id: string; label: string };

// A single native anchored dropdown menu (Jetpack Compose) that drills down
// from pääluokka into alaluokka in place, instead of mounting a second
// Host/DropdownMenu next to this one - two sibling Hosts turned out to be
// unreliable to touch input on Android.
export function CategoryDropdown({ categories, selectedCategoryId, onSelect }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openParent, setOpenParent] = useState<CategoryWithChildren | null>(null);

  const label = findSelectedName(categories, selectedCategoryId) ?? 'Valitse luokka';

  const items: MenuItem[] = openParent
    ? [
        { kind: 'back' },
        ...openParent.children.map((child): MenuItem => ({ kind: 'category', id: child.id, label: child.name })),
      ]
    : categories.map((category): MenuItem => ({ kind: 'category', id: category.id, label: category.name }));

  function handleItemClick(item: MenuItem) {
    if (item.kind === 'back') {
      setOpenParent(null);
      return;
    }

    if (!openParent) {
      const parent = categories.find((category) => category.id === item.id);
      if (parent && parent.children.length > 0) {
        setOpenParent(parent);
        return;
      }
    }

    setIsOpen(false);
    setOpenParent(null);
    onSelect(item.id);
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
            <DropdownMenuItem
              key={item.kind === 'back' ? 'back' : item.id}
              onClick={() => handleItemClick(item)}>
              <DropdownMenuItem.Text>
                <ComposeText>{item.kind === 'back' ? '← Takaisin' : item.label}</ComposeText>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
