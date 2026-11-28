// supabase-js's own error.message for a failed Edge Function call is always
// just "Edge Function returned a non-2xx status code" - the actual detail
// (our function's own { error: "..." } body, or whatever Supabase's gateway
// itself returned if the request never reached our function, e.g. a missing
// auth header) is only reachable via error.context, the raw Response. Show
// that raw body rather than assuming a shape, so a mismatch is visible
// instead of silently falling back to the generic message again.
export async function describeFunctionError(error: unknown): Promise<string> {
  // Duck-typed rather than `instanceof Response`: React Native's fetch
  // polyfill produces a Response whose prototype chain doesn't match the
  // global `Response` supabase-js's own fetch call sees, so `instanceof`
  // silently fails here.
  const context = (error as { context?: unknown } | null)?.context as
    | { text?: () => Promise<string>; status?: number }
    | undefined;

  if (context && typeof context.text === 'function') {
    try {
      const bodyText = await context.text();
      const status = typeof context.status === 'number' ? ` (HTTP ${context.status})` : '';
      if (!bodyText) return `Tyhjä vastaus palvelimelta${status}`;
      try {
        const parsed = JSON.parse(bodyText) as { error?: unknown };
        if (typeof parsed.error === 'string') return parsed.error;
        return `${bodyText}${status}`;
      } catch {
        return `${bodyText}${status}`;
      }
    } catch {
      // Body couldn't be read either - fall through to the generic message.
    }
  }

  return error instanceof Error ? error.message : String(error);
}
