import OpenAI from "openai";
import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {normalizeAbbr} from "@/lib/team-map";

export const maxDuration=26;

function n(v:any){return v==null||v===""?null:Number(v)}
function isoDay(v:any){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||""))?String(v):null}

export async function POST(req:Request){
  try{
    const {career,universe,client}=await requireAdmin();
    if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:"OPENAI_API_KEY fehlt."},{status:400});

    const b=await req.json();
    const images=Array.isArray(b.images)?b.images.filter((x:any)=>typeof x==="string"&&x.startsWith("data:image/")).slice(0,4):[];
    if(!images.length)return NextResponse.json({error:"Kein Screenshot übertragen."},{status:400});
    if(images.some((x:string)=>x.length>7_500_000))return NextResponse.json({error:"Ein Bild ist zu groß. Bitte Foto/Screenshot verkleinern."},{status:413});

    const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const prompt=`Analyze these NBA 2K MyNBA scoreboard / box-score screenshots.
The controlled career player is "${career.player_name}" on team ${career.current_team?.abbreviation||"unknown"}.
Extract ONLY values clearly visible in the screenshots. Never guess missing numbers.
A phone photo may be tilted or contain glare. Multiple images may show the same game and different stat pages.
Return team abbreviations when possible. If the image does not make home/away orientation clear, still return the two teams and set orientation_confident=false.
For player stats, look specifically for the controlled player name or a very close shortened form.
Use null for anything not visible.
Do not infer date from the website; date is only non-null when visible in the screenshot.
`;

    const inputContent:any[]=[{type:"input_text",text:prompt},...images.map((image_url:string)=>({type:"input_image",image_url,detail:"high"}))];
    const response=await ai.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5.6-luna",
      store:false,
      input:[{role:"user",content:inputContent}],
      text:{format:{
        type:"json_schema",name:"nba2k_scoreboard_scan",strict:true,
        schema:{
          type:"object",additionalProperties:false,
          required:["home_team","away_team","team_a","team_b","home_score","away_score","team_a_score","team_b_score","game_date","orientation_confident","player_found","player_name","stats","notes","confidence"],
          properties:{
            home_team:{type:["string","null"]},away_team:{type:["string","null"]},
            team_a:{type:["string","null"]},team_b:{type:["string","null"]},
            home_score:{type:["integer","null"]},away_score:{type:["integer","null"]},
            team_a_score:{type:["integer","null"]},team_b_score:{type:["integer","null"]},
            game_date:{type:["string","null"]},orientation_confident:{type:"boolean"},
            player_found:{type:"boolean"},player_name:{type:["string","null"]},
            stats:{type:"object",additionalProperties:false,required:["minutes","points","rebounds","assists","steals","blocks","turnovers","fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"],
              properties:{
                minutes:{type:["number","null"]},points:{type:["integer","null"]},rebounds:{type:["integer","null"]},assists:{type:["integer","null"]},
                steals:{type:["integer","null"]},blocks:{type:["integer","null"]},turnovers:{type:["integer","null"]},fouls:{type:["integer","null"]},
                fgm:{type:["integer","null"]},fga:{type:["integer","null"]},tpm:{type:["integer","null"]},tpa:{type:["integer","null"]},
                ftm:{type:["integer","null"]},fta:{type:["integer","null"]},plus_minus:{type:["integer","null"]}
              }},
            notes:{type:"array",items:{type:"string"}},confidence:{type:"integer",minimum:0,maximum:100}
          }
        }
      }}
    });

    const scan=JSON.parse(response.output_text);
    const teams=[scan.home_team,scan.away_team,scan.team_a,scan.team_b].filter(Boolean).map((x:string)=>normalizeAbbr(x));
    const pair=Array.from(new Set(teams)).slice(0,2);
    const date=isoDay(scan.game_date);

    const {data:games}=await client.from("games")
      .select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
      .or(`universe_id.is.null,universe_id.eq.${universe.id}`)
      .order("game_date");

    const candidates=(games||[]).filter((g:any)=>{
      const gp=[g.home?.abbreviation,g.away?.abbreviation];
      const teamMatch=pair.length===2&&pair.every((a:string)=>gp.includes(a));
      const currentTeamMatch=gp.includes(career.current_team?.abbreviation);
      return teamMatch || (pair.length===1&&gp.includes(pair[0])&&currentTeamMatch);
    }).map((g:any)=>{
      const d=Math.abs(new Date(g.game_day).getTime()-new Date(date||career.universe_date).getTime());
      return {...g,distance:d};
    }).sort((a:any,b:any)=>a.distance-b.distance).slice(0,5);

    let matchedGameId:string|null=null;
    if(candidates.length===1)matchedGameId=candidates[0].id;
    else if(candidates.length>1&&candidates[0].distance<candidates[1].distance)matchedGameId=candidates[0].id;

    const stats:any={};
    for(const [k,v] of Object.entries(scan.stats||{}))stats[k]=n(v);

    return NextResponse.json({
      ok:true,
      scan:{...scan,stats},
      matchedGameId,
      candidates:candidates.map((g:any)=>({id:g.id,game_day:g.game_day,home:g.home,away:g.away,stage:g.stage})),
      message:matchedGameId?"Screenshot erkannt und Spiel zugeordnet.":"Screenshot erkannt. Bitte Spiel prüfen/auswählen."
    });
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
