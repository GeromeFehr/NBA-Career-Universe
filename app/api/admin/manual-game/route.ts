import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";

export async function POST(req:Request){
  try{
    const {career,universe,client}=await requireAdmin();
    const b=await req.json();
    const homeTeamId=String(b.homeTeamId||""),awayTeamId=String(b.awayTeamId||"");
    const gameDay=String(b.gameDay||"");
    if(!homeTeamId||!awayTeamId||homeTeamId===awayTeamId)return NextResponse.json({error:"Zwei unterschiedliche Teams auswählen."},{status:400});
    if(!/^\d{4}-\d{2}-\d{2}$/.test(gameDay))return NextResponse.json({error:"Ungültiges Spieldatum."},{status:400});
    if(homeTeamId!==career.current_team_id&&awayTeamId!==career.current_team_id)return NextResponse.json({error:"Das gesteuerte Team muss an diesem Spiel teilnehmen."},{status:400});

    let seasonId=b.seasonId||universe.current_season_id;
    if(!seasonId)return NextResponse.json({error:"Keine Saison ausgewählt."},{status:400});

    const key=`manual_${universe.id}_${gameDay}_${awayTeamId}_${homeTeamId}_${crypto.randomUUID().slice(0,8)}`;
    const hour=String(b.tipoff||"20:00");
    const dt=new Date(`${gameDay}T${/^\d{2}:\d{2}$/.test(hour)?hour:"20:00"}:00Z`);

    const {data:game,error}=await client.from("games").insert({
      universe_id:universe.id,
      season_id:seasonId,
      source_key:key,
      external_id:null,
      game_date:dt.toISOString(),
      game_day:gameDay,
      stage:String(b.stage||"Regular Season"),
      home_team_id:homeTeamId,
      away_team_id:awayTeamId,
      home_score:null,
      away_score:null,
      status:"scheduled",
      venue:String(b.venue||"")||null,
      broadcast:null,
      data_source:"manual-mynba",
      counts_toward_standings:b.countsTowardStandings!==false,
      notes:String(b.notes||"")||null
    }).select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").single();
    if(error||!game)throw error||new Error("Spiel konnte nicht erstellt werden.");
    return NextResponse.json({ok:true,game,message:`${game.away?.abbreviation} @ ${game.home?.abbreviation} angelegt`});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
