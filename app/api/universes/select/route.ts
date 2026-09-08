import {apiFailure} from "@/lib/http";
import { NextResponse } from "next/server";
import { requireUser, apiStatus } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { universeId } = await req.json();
    const { data: universe } = await db().from("universes").select("id").eq("id", universeId).eq("owner_id", user.id).maybeSingle();
    if (!universe) return NextResponse.json({ error:"Universe nicht gefunden" }, { status:404 });

    const response = NextResponse.json({ ok:true });
    response.cookies.set("nba_universe", universe.id, { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:60*60*24*365 });
    return response;
  } catch (e) {
    return apiFailure(e);
  }
}
