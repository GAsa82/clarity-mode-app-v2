import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;

/**
 * Privileged client — bypasses RLS. Required for payment writes (orders,
 * subscriptions, marking submissions paid). If SUPABASE_SERVICE_ROLE_KEY is
 * missing/invalid, every query fails with "Invalid API key" — use
 * serviceKeyOk() to detect that BEFORE letting a user pay.
 */
// trim(): env values set via piped CLI input (e.g. PowerShell) can carry an
// invisible trailing CR/LF, which makes an otherwise-valid key fail as
// "Invalid API key" when sent in an HTTP header.
export const serviceClient = createClient(
  url,
  (process.env.SUPABASE_SERVICE_ROLE_KEY || "not-configured").trim()
);

/**
 * Anon client — for data with public read policies (site_settings,
 * old_books) and for validating user JWTs. Immune to a broken service key,
 * so price/config lookups never depend on it.
 */
export const anonClient = createClient(
  url,
  (process.env.VITE_SUPABASE_ANON_KEY || "not-configured").trim()
);

let serviceOkCache = null;

/** True when the service-role key actually works against the database. */
export async function serviceKeyOk() {
  // Only success is cached: a failure may be transient (or freshly fixed
  // env/grants), so warm instances must re-check instead of pinning "broken".
  if (serviceOkCache === true) return true;
  const { error } = await serviceClient
    .from("site_settings")
    .select("key")
    .limit(1);
  if (error) {
    console.error(
      "[payments] SUPABASE_SERVICE_ROLE_KEY is not working — payment writes are impossible. " +
        "Check the key (Supabase Dashboard → Settings → API) in Vercel env AND the " +
        `service_role grants in the database. Underlying error: ${error.message}`
    );
    return false;
  }
  serviceOkCache = true;
  return true;
}
