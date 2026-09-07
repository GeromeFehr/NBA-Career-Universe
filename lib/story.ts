import {db} from "@/lib/db";

export async function detectMilestones(careerId:string,stat:any){
  if(stat.appearance_status!=="played")return [];
  const client=db();
  const {data:career}=await client.from("career_profiles").select("universes(language)").eq("id",careerId).single();
  const en=career?.universes?.language==="en";
  const codes:{code:string;title:string;description:string}[]=[];
  const cats=[stat.points,stat.rebounds,stat.assists,stat.steals,stat.blocks].filter((x:number)=>Number(x)>=10).length;

  if(stat.points>=50)codes.push({code:"PTS_50",title:en?"50-point game":"50-Punkte-Spiel",description:en?`${stat.points} points in one game.`:`${stat.points} Punkte in einem Spiel.`});
  if(stat.rebounds>=20)codes.push({code:"REB_20",title:en?"20-rebound game":"20-Rebound-Spiel",description:en?`${stat.rebounds} rebounds in one game.`:`${stat.rebounds} Rebounds in einem Spiel.`});
  if(stat.blocks>=10)codes.push({code:"BLK_10",title:en?"10-block game":"10-Block-Spiel",description:en?`${stat.blocks} blocks in one game.`:`${stat.blocks} Blocks in einem Spiel.`});
  if(cats>=3)codes.push({code:"TRIPLE_DOUBLE",title:"Triple-Double",description:en?"Double digits in at least three major categories.":"Zweistellig in mindestens drei Hauptkategorien."});
  if([stat.points,stat.rebounds,stat.assists,stat.steals,stat.blocks].every((x:number)=>Number(x)>=5))
    codes.push({code:"FIVE_BY_FIVE",title:"5x5",description:en?"At least five in all five major categories.":"Mindestens fünf in allen fünf Hauptkategorien."});

  const {data:previous}=await client.from("player_game_stats").select("points,rebounds,assists,blocks").eq("career_id",careerId).neq("id",stat.id);
  const prev=previous||[];
  const prevMax=(k:string)=>prev.reduce((m:any,r:any)=>Math.max(m,Number(r[k]||0)),0);
  if(stat.points>prevMax("points"))codes.push({code:"CAREER_HIGH_PTS",title:en?"Career-high points":"Career High Punkte",description:en?`New career high: ${stat.points} points.`:`Neuer Karrierebestwert: ${stat.points} Punkte.`});
  if(stat.blocks>prevMax("blocks"))codes.push({code:"CAREER_HIGH_BLK",title:en?"Career-high blocks":"Career High Blocks",description:en?`New career high: ${stat.blocks} blocks.`:`Neuer Karrierebestwert: ${stat.blocks} Blocks.`});

  for(const m of codes){
    await client.from("milestones").upsert({
      career_id:careerId,game_id:stat.game_id,code:m.code,title:m.title,description:m.description
    },{onConflict:"career_id,game_id,code"});
  }
  return codes;
}
