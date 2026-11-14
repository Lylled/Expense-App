import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthButton } from '@/components/auth/auth-button';
import { AuthForm } from '@/components/auth/auth-form';
import { AuthPasswordField } from '@/components/auth/auth-password-field';
import { AuthScreen } from '@/components/auth/auth-screen';
import { AuthTextField } from '@/components/auth/auth-text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { translateAuthError } from '@/lib/auth-errors';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleRegister() {
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Salasanat eivät täsmää.');
      return;
    }

    setIsSubmitting(true);
    const { error, needsEmailConfirmation } = await signUp(email.trim(), password);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(translateAuthError(error));
      return;
    }

    if (needsEmailConfirmation) setConfirmationSent(true);
  }

  const canSubmit =
    email.trim().length > 0 && password.length > 0 && confirmPassword.length > 0 && !isSubmitting;

  if (confirmationSent) {
    return (
      <AuthScreen title="Tarkista sähköpostisi">
        <ThemedText type="small" style={styles.centerText}>
          Lähetimme vahvistuslinkin osoitteeseen {email.trim()}. Vahvista tilisi ennen
          kirjautumista.
        </ThemedText>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <ThemedText type="linkPrimary">Takaisin kirjautumiseen</ThemedText>
          </Pressable>
        </Link>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Rekisteröidy">
      <AuthForm>
        <AuthTextField
          placeholder="Sähköposti"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <AuthPasswordField
          placeholder="Salasana"
          autoCapitalize="none"
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
          Vähintään 6 merkkiä
        </ThemedText>
        <AuthPasswordField
          placeholder="Vahvista salasana"
          autoCapitalize="none"
          autoComplete="new-password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </AuthForm>

      {errorMessage !== '' && (
        <ThemedText type="small" style={styles.centerText}>
          {errorMessage}
        </ThemedText>
      )}

      <AuthButton
        label="Rekisteröidy"
        onPress={handleRegister}
        disabled={!canSubmit}
        isSubmitting={isSubmitting}
      />

      <Link href="/(auth)/login" asChild>
        <Pressable>
          <ThemedText type="linkPrimary">Onko sinulla jo tili? Kirjaudu</ThemedText>
        </Pressable>
      </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: 'center',
  },
  hintText: {
    marginTop: -Spacing.two,
  },
});
