const KNOWN_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Väärä sähköposti tai salasana.',
  'User already registered': 'Tällä sähköpostilla on jo tili.',
  'Email not confirmed': 'Vahvista sähköpostisi ensin kirjautumislinkistä.',
  'Password should be at least 6 characters.': 'Salasanan tulee olla vähintään 6 merkkiä pitkä.',
  'Unable to validate email address: invalid format': 'Sähköpostiosoite ei ole kelvollinen.',
};

export function translateAuthError(message: string): string {
  return KNOWN_MESSAGES[message] ?? message;
}
