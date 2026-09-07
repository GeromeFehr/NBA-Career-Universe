import { NextResponse } from "next/server";
import { authDb } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const displayName = String(form.get("displayName") || "").trim();

  if (password.length < 8) {
    return NextResponse.redirect(new URL("/register?error=password", req.url), 303);
  }

  const supabase = await authDb();
  const origin = new URL(req.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || null },
      emailRedirectTo: origin + "/login"
    }
  });

  if (error) return NextResponse.redirect(new URL("/register?error=signup", req.url), 303);
  if (!data.session) return NextResponse.redirect(new URL("/login?message=confirm", req.url), 303);

  return NextResponse.redirect(new URL("/universes", req.url), 303);
}
