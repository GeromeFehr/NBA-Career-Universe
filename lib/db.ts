import { createClient } from "@supabase/supabase-js";

export function hasDatabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Central server-side Supabase client.
 *
 * The project does not currently ship generated Supabase Database types.
 * Explicitly returning `any` here prevents PostgREST's generic `T | null`
 * inference from blocking production builds while runtime guards and the
 * database constraints remain authoritative.
 *
 * TODO: replace `any` with generated Database types once the schema is stable.
 */
export function db(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
