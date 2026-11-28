import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { usePersistedChoice } from '@/hooks/use-persisted-choice';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference, type ThemePreference } from '@/hooks/use-theme-preference';
import { describeFunctionError } from '@/lib/edge-functions';
import {
  RECEIPT_STORAGE_LABELS,
  RECEIPT_STORAGE_MODES,
  RECEIPT_STORAGE_STORAGE_KEY,
  type ReceiptStorageMode,
} from '@/lib/receipt-storage';
import { supabase } from '@/lib/supabase';

const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: 'Vaalea',
  dark: 'Tumma',
  system: 'Järjestelmä',
};

export default function SettingsScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const [receiptStorageMode, setReceiptStorageMode] = usePersistedChoice(
    RECEIPT_STORAGE_STORAGE_KEY,
    RECEIPT_STORAGE_MODES,
    'none'
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  async function handleChangePassword() {
    setPasswordMessage('');

    if (newPassword.length < 6) {
      setPasswordMessage('Uuden salasanan pitää olla vähintään 6 merkkiä.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Uusi salasana ja vahvistus eivät täsmää.');
      return;
    }
    if (!session?.user.email) {
      setPasswordMessage('Sähköpostiosoitetta ei löytynyt.');
      return;
    }

    setIsChangingPassword(true);

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });
    if (reauthError) {
      setPasswordMessage('Nykyinen salasana on väärin.');
      setIsChangingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);

    if (error) {
      setPasswordMessage(error.message);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('Salasana vaihdettu.');
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setDeleteMessage('');

    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      setDeleteMessage(await describeFunctionError(error));
      setIsDeleting(false);
      return;
    }

    // The account is already gone server-side at this point; signOut() just
    // clears the now-stale local session so the app navigates away. Ignore
    // any error from it rather than leaving the screen stuck on "Poistetaan…".
    try {
      await signOut();
    } catch {
      // Intentionally ignored - see comment above.
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Poista profiili',
      'Tämä poistaa tilisi ja kaikki tietosi pysyvästi. Tätä ei voi perua.',
      [
        { text: 'Peruuta', style: 'cancel' },
        { text: 'Poista', style: 'destructive', onPress: handleDeleteAccount },
      ]
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="title" style={styles.title}>
            Asetukset
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Tili</ThemedText>
            {session?.user.email && (
              <ThemedText type="small" themeColor="textSecondary">
                {session.user.email}
              </ThemedText>
            )}
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundSelected }]}
              onPress={() => signOut()}>
              <ThemedText type="smallBold">Kirjaudu ulos</ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Vaihda salasana</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Nykyinen salasana"
              placeholderTextColor="#8A8A8E"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Uusi salasana"
              placeholderTextColor="#8A8A8E"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Vahvista uusi salasana"
              placeholderTextColor="#8A8A8E"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {passwordMessage && <ThemedText type="small">{passwordMessage}</ThemedText>}
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundSelected }]}
              onPress={handleChangePassword}
              disabled={isChangingPassword}>
              <ThemedText type="smallBold">
                {isChangingPassword ? 'Vaihdetaan…' : 'Vaihda salasana'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Poista profiili</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Poistaa tilisi ja kaikki menosi ja kategoriasi pysyvästi.
            </ThemedText>
            {deleteMessage && <ThemedText type="small">{deleteMessage}</ThemedText>}
            <Pressable
              style={[styles.button, styles.destructiveButton]}
              onPress={confirmDeleteAccount}
              disabled={isDeleting}>
              <ThemedText type="smallBold" style={styles.destructiveButtonText}>
                {isDeleting ? 'Poistetaan…' : 'Poista profiili'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Teema</ThemedText>
            <View style={styles.chipRow}>
              {(Object.keys(THEME_PREFERENCE_LABELS) as ThemePreference[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setThemePreference(option)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        themePreference === option ? theme.backgroundSelected : theme.background,
                    },
                  ]}>
                  <ThemedText type="small">{THEME_PREFERENCE_LABELS[option]}</ThemedText>
                </Pressable>
              ))}
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Kuittikuvien tallennus</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Minne kuitista otettu kuva tallennetaan kuvauksen jälkeen.
            </ThemedText>
            <View style={styles.chipRow}>
              {(Object.keys(RECEIPT_STORAGE_LABELS) as ReceiptStorageMode[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setReceiptStorageMode(option)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        receiptStorageMode === option ? theme.backgroundSelected : theme.background,
                    },
                  ]}>
                  <ThemedText type="small">{RECEIPT_STORAGE_LABELS[option]}</ThemedText>
                </Pressable>
              ))}
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  scroll: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  title: {
    textAlign: 'center',
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  button: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    alignItems: 'center',
  },
  destructiveButton: {
    backgroundColor: '#D64545',
  },
  destructiveButtonText: {
    color: '#ffffff',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
