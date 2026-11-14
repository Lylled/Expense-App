import { useState } from 'react';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';

import { AuthTextField } from '@/components/auth/auth-text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function AuthPasswordField(props: Omit<TextInputProps, 'secureTextEntry'>) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.container}>
      <AuthTextField {...props} secureTextEntry={!isVisible} style={styles.input} />
      <Pressable
        onPress={() => setIsVisible((value) => !value)}
        style={styles.toggle}
        hitSlop={Spacing.two}>
        <ThemedText type="small" style={styles.toggleText}>
          {isVisible ? 'Piilota' : 'Näytä'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
  input: {
    paddingRight: 72,
  },
  toggle: {
    position: 'absolute',
    right: Spacing.three,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  toggleText: {
    color: '#208AEF',
  },
});
