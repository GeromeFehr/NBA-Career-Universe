import {privateResponse} from "@/lib/private-response";
import { NextResponse } from "next/server";
import { authDb } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const form = await req.formData();
  const lang=form.get("language")==="en"?"en":"de";
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");

  const supabase = await authDb();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return privateResponse(NextResponse.redirect(new URL(`/login?error=1&lang=${lang}`, req.url), 303));

  return privateResponse(NextResponse.redirect(new URL("/universes", req.url), 303));
}
