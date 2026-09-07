import { NextResponse } from "next/server";
import { authDb } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await authDb();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/login", req.url), 303);
  response.cookies.set("nba_universe", "", { path: "/", maxAge: 0 });
  return response;
}
