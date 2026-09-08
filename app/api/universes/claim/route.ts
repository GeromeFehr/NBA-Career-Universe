import {timingSafeEqual,createHash} from "node:crypto";
import {apiFailure} from "@/lib/http";
import { NextResponse } from "next/server";
import { requireUser, apiStatus } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { universeId, legacyPassword } = await req.json();
    if (!process.env.ADMIN_PASSWORD || !timingSafeEqual(createHash("sha256").update(String(legacyPassword||"")).digest(),createHash("sha256").update(process.env.ADMIN_PASSWORD).digest())) {
      return NextResponse.json({error:"Legacy-Admin-Passwort stimmt nicht."},{status:403});
    }

    const client = db();
    const { data: universe } = await client.from("universes").select("*").eq("id",universeId).is("owner_id",null).maybeSingle();
    if (!universe) return NextResponse.json({error:"Diese Legacy-Karriere wurde bereits übernommen."},{status:409});

    const { data:claimed,error } = await client.from("universes").update({owner_id:user.id,updated_at:new Date().toISOString()}).eq("id",universe.id).is("owner_id",null).select("id").maybeSingle();
    if (error) throw error;
    if(!claimed)throw Error("FORBIDDEN");

    const response = NextResponse.json({ok:true});
    response.cookies.set("nba_universe", universe.id, { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:60*60*24*365 });
    return response;
  } catch (e) {
    return apiFailure(e);
  }
}
