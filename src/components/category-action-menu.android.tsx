import { DropdownMenu, DropdownMenuItem, Host, Text as ComposeText } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type CategoryActionMenuProps = {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
};

// Native anchored dropdown menu (Jetpack Compose), matching the system
// menu look (e.g. Google Photos' "..." menu) instead of a centered alert.
export function CategoryActionMenu({ onEdit, onDelete }: CategoryActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Host matchContents>
      <DropdownMenu expanded={isOpen} onDismissRequest={() => setIsOpen(false)}>
        <DropdownMenu.Trigger>
          <Pressable
            onPress={() => setIsOpen(true)}
            hitSlop={Spacing.two}
            style={styles.menuButton}>
            <ThemedText type="smallBold" style={styles.menuDots}>
              ⋯
            </ThemedText>
          </Pressable>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              onEdit();
            }}>
            <DropdownMenuItem.Text>
              <ComposeText>Muokkaa</ComposeText>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}>
            <DropdownMenuItem.Text>
              <ComposeText>Poista</ComposeText>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    paddingHorizontal: Spacing.two,
  },
  menuDots: {
    fontSize: 20,
  },
});
