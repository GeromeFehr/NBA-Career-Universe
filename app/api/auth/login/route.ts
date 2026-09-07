import { NextResponse } from "next/server";
import { authDb } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");

  const supabase = await authDb();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.redirect(new URL("/login?error=1", req.url), 303);

  return NextResponse.redirect(new URL("/universes", req.url), 303);
}
