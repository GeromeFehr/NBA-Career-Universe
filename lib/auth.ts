import { cookies } from "next/headers";
import { authDb, hasAuthConfig } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function currentUser() {
  if (!hasAuthConfig()) return null;
  const client = await authDb();
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const store = await cookies();
  const universeId = store.get("nba_universe")?.value;
  if (!universeId) throw new Error("NO_UNIVERSE");

  const client = db();
  const { data: universe } = await client.from("universes").select("*").eq("id", universeId).maybeSingle();
  if (!universe || universe.owner_id !== user.id) throw new Error("FORBIDDEN");

  const { data: career } = await client
    .from("career_profiles")
    .select("*,current_team:teams(*)")
    .eq("universe_id", universe.id)
    .maybeSingle();

  if (!career) throw new Error("NO_CAREER");
  return { user, universe, career, client };
}

export async function isAdmin() {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

export function apiStatus(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "UNAUTHORIZED") return 401;
  if (message === "FORBIDDEN") return 403;
  if (message === "NO_UNIVERSE" || message === "NO_CAREER") return 409;
  return 500;
}
