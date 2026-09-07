import { NextResponse } from "next/server";
import { requireUser, apiStatus } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { universeId, visibility } = await req.json();
    if (!["private","public"].includes(visibility)) return NextResponse.json({error:"Ungültige Sichtbarkeit"},{status:400});
    const { error } = await db().from("universes").update({visibility,updated_at:new Date().toISOString()}).eq("id",universeId).eq("owner_id",user.id);
    if (error) throw error;
    return NextResponse.json({ok:true});
  } catch (e) {
    return NextResponse.json({ error:e instanceof Error?e.message:String(e) }, { status:apiStatus(e) });
  }
}
