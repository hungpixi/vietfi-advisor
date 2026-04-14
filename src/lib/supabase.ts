import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ─── Browser Client (dùng trong React components) ─── */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key) as SupabaseClient;
}

/* ─── Server Client (dùng trong API routes, cron jobs) ─── */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient;
}

/* ─── Singleton browser client ─── */
let browserClient: SupabaseClient | null = null;

export function getSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}
