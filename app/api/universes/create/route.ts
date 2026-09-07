import { NextResponse } from "next/server";
import { requireUser, apiStatus } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json();
    const client = db();

    const name = String(b.name||"").trim();
    const playerName = String(b.playerName||"").trim();
    const teamId = String(b.teamId||"");
    if (!name || !playerName || !teamId) return NextResponse.json({error:"Name, Spieler und Team sind Pflicht."},{status:400});

    const { data: season } = await client.from("seasons").select("*").eq("current",true).maybeSingle();
    const { data: team } = await client.from("teams").select("id").eq("id",teamId).eq("active",true).maybeSingle();
    if (!season || !team) return NextResponse.json({error:"Saison oder Team nicht gefunden."},{status:400});

    const universeDate = String(b.universeDate || season.start_date);
    const { data: universe, error:uErr } = await client.from("universes").insert({
      owner_id:user.id,
      name,
      visibility:"private",
      current_season_id:season.id,
      universe_date:universeDate
    }).select("*").single();
    if (uErr || !universe) throw uErr || new Error("Universe konnte nicht erstellt werden.");

    const { data: career, error:cErr } = await client.from("career_profiles").insert({
      universe_id:universe.id,
      player_name:playerName,
      position:String(b.position||"SG/SF"),
      jersey_number:b.jerseyNumber==null||b.jerseyNumber===""?null:Number(b.jerseyNumber),
      overall:Math.max(25,Math.min(99,Number(b.overall||75))),
      draft_year:b.draftYear?Number(b.draftYear):null,
      draft_round:b.draftRound?Number(b.draftRound):1,
      draft_pick:b.draftPick?Number(b.draftPick):null,
      current_team_id:teamId,
      rookie_season_id:season.id,
      universe_date:universeDate
    }).select("*").single();

    if (cErr || !career) {
      await client.from("universes").delete().eq("id",universe.id);
      throw cErr || new Error("Karriere konnte nicht erstellt werden.");
    }

    await Promise.all([
      client.from("world_settings").insert({career_id:career.id,universe_date:universeDate,current_season_id:season.id}),
      client.from("team_stints").insert({career_id:career.id,team_id:teamId,start_date:universeDate,acquisition:"Career creation"})
    ]);

    const response = NextResponse.json({ok:true,universeId:universe.id});
    response.cookies.set("nba_universe", universe.id, { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:60*60*24*365 });
    return response;
  } catch (e) {
    return NextResponse.json({ error:e instanceof Error?e.message:String(e) }, { status:apiStatus(e) });
  }
}
