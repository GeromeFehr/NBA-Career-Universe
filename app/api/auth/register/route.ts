import {privateResponse} from "@/lib/private-response";
import { NextResponse } from "next/server";
import { authDb } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const lang=form.get("language")==="en"?"en":"de";
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const displayName = String(form.get("displayName") || "").trim();

  if (password.length < 8) {
    return privateResponse(NextResponse.redirect(new URL(`/register?error=password&lang=${lang}`, req.url), 303));
  }

  const supabase = await authDb();
  const origin = new URL(req.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || null },
      emailRedirectTo: origin + `/auth/callback?lang=${lang}`
    }
  });

  if (error) return privateResponse(NextResponse.redirect(new URL(`/register?error=signup&lang=${lang}`, req.url), 303));
  if (!data.session) return privateResponse(NextResponse.redirect(new URL(`/login?message=confirm&lang=${lang}`, req.url), 303));

  return privateResponse(NextResponse.redirect(new URL("/universes", req.url), 303));
}
