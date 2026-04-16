/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ─── Browser Client (dùng trong React components) ─── */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(url, key) as SupabaseClient<any>;
}

/* ─── Server Client (dùng trong API routes, cron jobs) ─── */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient<any>;
}

/* ─── Singleton browser client ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let browserClient: SupabaseClient<any> | null = null;

export function getSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient();
  }
  return browserClient;
}
