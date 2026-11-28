// Supabase Edge Function: delete-account
//
// Permanently deletes the calling user's own auth account. This can only be
// done with the service role key (never shipped to the app), so it needs a
// function: the client's anon key alone has no permission to remove an
// auth.users row. Deleting that row cascades to the user's categories and
// expenses automatically (both reference it with "on delete cascade").
//
// "Verify JWT" is left on (the default) for this function, so Supabase's own
// gateway already rejects a request with no valid session before this code
// runs; SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
// to every Edge Function, no secret to configure.

import { createClient } from 'npm:@supabase/supabase-js@2';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Valtuutus puuttuu.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Palvelinta ei ole määritetty oikein.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const accessToken = authHeader.replace(/^Bearer /, '');

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return jsonResponse({ error: 'Virheellinen istunto.' }, 401);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);
  if (deleteError) return jsonResponse({ error: deleteError.message }, 500);

  return jsonResponse({ success: true }, 200);
});
