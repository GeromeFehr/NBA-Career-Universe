import { NextResponse } from "next/server";
import { requireUser, apiStatus } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { universeId, legacyPassword } = await req.json();
    if (!process.env.ADMIN_PASSWORD || legacyPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({error:"Legacy-Admin-Passwort stimmt nicht."},{status:403});
    }

    const client = db();
    const { data: universe } = await client.from("universes").select("*").eq("id",universeId).is("owner_id",null).maybeSingle();
    if (!universe) return NextResponse.json({error:"Diese Legacy-Karriere wurde bereits übernommen."},{status:409});

    const { error } = await client.from("universes").update({owner_id:user.id,updated_at:new Date().toISOString()}).eq("id",universe.id).is("owner_id",null);
    if (error) throw error;

    const response = NextResponse.json({ok:true});
    response.cookies.set("nba_universe", universe.id, { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:60*60*24*365 });
    return response;
  } catch (e) {
    return NextResponse.json({ error:e instanceof Error?e.message:String(e) }, { status:apiStatus(e) });
  }
}
