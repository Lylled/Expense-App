import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthButton } from '@/components/auth/auth-button';
import { AuthForm } from '@/components/auth/auth-form';
import { AuthPasswordField } from '@/components/auth/auth-password-field';
import { AuthScreen } from '@/components/auth/auth-screen';
import { AuthTextField } from '@/components/auth/auth-text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/use-auth';
import { translateAuthError } from '@/lib/auth-errors';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin() {
    setErrorMessage('');
    setIsSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (error) setErrorMessage(translateAuthError(error));
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  return (
    <AuthScreen title="Kirjaudu sisään">
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
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />
      </AuthForm>

      {errorMessage !== '' && (
        <ThemedText type="small" style={styles.centerText}>
          {errorMessage}
        </ThemedText>
      )}

      <AuthButton
        label="Kirjaudu"
        onPress={handleLogin}
        disabled={!canSubmit}
        isSubmitting={isSubmitting}
      />

      <Link href="/(auth)/register" asChild>
        <Pressable>
          <ThemedText type="linkPrimary">Ei vielä tiliä? Rekisteröidy</ThemedText>
        </Pressable>
      </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: 'center',
  },
});
