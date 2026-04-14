import { createClient } from "@supabase/supabase-js";

export type CronJobKey = "market-data" | "morning-brief" | "macro-update";

interface CronCacheRow {
  payload: unknown;
  fetched_at: string;
}

export interface CronCacheValue<T> {
  payload: T;
  fetchedAt: number;
}

function getCronCacheClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function readCronCache<T>(
  jobKey: CronJobKey,
): Promise<CronCacheValue<T> | null> {
  const client = getCronCacheClient();
  if (!client) return null;

  const { data, error } = await client
    .from("cron_cache")
    .select("payload,fetched_at")
    .eq("job_key", jobKey)
    .maybeSingle<CronCacheRow>();

  if (error || !data?.payload || !data.fetched_at) {
    return null;
  }

  const fetchedAt = new Date(data.fetched_at).getTime();
  if (Number.isNaN(fetchedAt)) return null;

  return {
    payload: data.payload as T,
    fetchedAt,
  };
}

export async function writeCronCache(
  jobKey: CronJobKey,
  payload: unknown,
  source = "cron",
): Promise<boolean> {
  const client = getCronCacheClient();
  if (!client) return false;

  const nowIso = new Date().toISOString();

  const { error } = await client.from("cron_cache").upsert(
    {
      job_key: jobKey,
      payload,
      fetched_at: nowIso,
      source,
      updated_at: nowIso,
    },
    { onConflict: "job_key" },
  );

  return !error;
}
