import {apiFailure} from "@/lib/http";
import { NextResponse } from "next/server";
import { requireUser, apiStatus } from "@/lib/auth";
import {readJson} from "@/lib/http";
import {uuid} from "@/lib/game-input";
import {privateResponse} from "@/lib/private-response";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b=await readJson(req);
    const universeId=uuid(b.universeId);
    const { data: universe } = await db().from("universes").select("id,game,language").eq("id", universeId).eq("owner_id", user.id).maybeSingle();
    if (!universe) return NextResponse.json({ error:"Universe nicht gefunden" }, { status:404 });

    const response = NextResponse.json({ ok:true,href:universe.game==="fc"?"/fc":"/" });
    response.cookies.set("nba_universe", universe.id, { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:60*60*24*365 });
    response.cookies.set("nba_ui_language",universe.language,{sameSite:"lax",path:"/",maxAge:31536000});
    return privateResponse(response);
  } catch (e) {
    return apiFailure(e);
  }
}
