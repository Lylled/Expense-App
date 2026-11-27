import { DropdownMenu, DropdownMenuItem, Host, Text as ComposeText } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Pressable } from 'react-native';

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

// Native anchored dropdown menu (Jetpack Compose), matching the system
// menu look instead of a centered alert.
export function OptionDropdown({ label, options, onSelect }: OptionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Host matchContents>
      <DropdownMenu expanded={isOpen} onDismissRequest={() => setIsOpen(false)}>
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
          {options.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onClick={() => {
                setIsOpen(false);
                onSelect(option.id);
              }}>
              <DropdownMenuItem.Text>
                <ComposeText>{option.label}</ComposeText>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
