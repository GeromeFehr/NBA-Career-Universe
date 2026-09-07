import { db } from "@/lib/db";

export async function detectMilestones(careerId:string, stat:any) {
  if (stat.appearance_status !== "played") return [];
  const codes:{code:string;title:string;description:string}[] = [];
  const cats = [stat.points,stat.rebounds,stat.assists,stat.steals,stat.blocks].filter((x:number)=>Number(x)>=10).length;
  if (stat.points >= 50) codes.push({code:"PTS_50",title:"50-Punkte-Spiel",description:`${stat.points} Punkte in einem Spiel.`});
  if (stat.rebounds >= 20) codes.push({code:"REB_20",title:"20-Rebound-Spiel",description:`${stat.rebounds} Rebounds in einem Spiel.`});
  if (stat.blocks >= 10) codes.push({code:"BLK_10",title:"10-Block-Spiel",description:`${stat.blocks} Blocks in einem Spiel.`});
  if (cats >= 3) codes.push({code:"TRIPLE_DOUBLE",title:"Triple-Double",description:"Dreistellig in mindestens drei Hauptkategorien."});
  if ([stat.points,stat.rebounds,stat.assists,stat.steals,stat.blocks].every((x:number)=>Number(x)>=5))
    codes.push({code:"FIVE_BY_FIVE",title:"5x5",description:"Mindestens fünf in allen fünf Hauptkategorien."});

  const client = db();
  const { data: previous } = await client.from("player_game_stats")
    .select("points,rebounds,assists,blocks").eq("career_id",careerId).neq("id",stat.id);
  const prev = previous || [];
  const prevMax = (k:string)=>prev.reduce((m:any,r:any)=>Math.max(m,Number(r[k]||0)),0);
  if (stat.points > prevMax("points")) codes.push({code:"CAREER_HIGH_PTS",title:"Career High Punkte",description:`Neuer Karrierebestwert: ${stat.points} Punkte.`});
  if (stat.blocks > prevMax("blocks")) codes.push({code:"CAREER_HIGH_BLK",title:"Career High Blocks",description:`Neuer Karrierebestwert: ${stat.blocks} Blocks.`});

  for (const m of codes) {
    await client.from("milestones").upsert({
      career_id:careerId, game_id:stat.game_id, code:m.code, title:m.title, description:m.description
    }, {onConflict:"career_id,game_id,code"});
  }
  return codes;
}
