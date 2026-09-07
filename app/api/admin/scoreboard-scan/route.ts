import OpenAI from "openai";
import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";
import {normalizeAbbr} from "@/lib/team-map";
import {logAiUsage} from "@/lib/ai-usage";

export const maxDuration=26;

function n(v:any){return v==null||v===""?null:Number(v)}
function isoDay(v:any){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||""))?String(v):null}

export async function POST(req:Request){
  try{
    const {career,universe,client}=await requireAdmin();
    if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:"OPENAI_API_KEY fehlt."},{status:400});

    const b=await req.json();
    const images=Array.isArray(b.images)?b.images.filter((x:any)=>typeof x==="string"&&x.startsWith("data:image/")).slice(0,2):[];
    const precision=b.precision==="high"?"high":"low";
    if(!images.length)return NextResponse.json({error:"Kein Screenshot übertragen."},{status:400});
    if(images.some((x:string)=>x.length>4_500_000))return NextResponse.json({error:universe.language==="en"?"An image is still too large after optimization.":"Ein Bild ist trotz Optimierung noch zu groß."},{status:413});

    let expectedContext="";
    if(b.expectedGameId){
      const {data:expected}=await client.from("games")
        .select("game_day,home:teams!games_home_team_id_fkey(abbreviation),away:teams!games_away_team_id_fkey(abbreviation)")
        .eq("id",String(b.expectedGameId)).maybeSingle();
      if(expected)expectedContext=` Expected matchup: ${expected.away?.abbreviation} @ ${expected.home?.abbreviation} on ${expected.game_day}.`;
    }

    const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const modelName=process.env.OPENAI_MODEL||"gpt-5.6-luna";
    const prompt=`Read NBA 2K MyNBA scoreboard/box-score image(s). Controlled player: ${career.player_name}; team: ${career.current_team?.abbreviation||"unknown"}.${expectedContext}
Extract only visible values. Never guess. Use null for missing values. Return team abbreviations when visible. If home/away orientation is unclear set orientation_confident=false. Find the controlled player or a close shortened form. Give conservative 0-100 confidence for every field; 0 if not visible. Date is null unless actually visible.`;

    const inputContent:any[]=[{type:"input_text",text:prompt},...images.map((image_url:string)=>({type:"input_image",image_url,detail:precision}))];
    const response=await ai.responses.create({
      model:modelName,
      store:false,
      input:[{role:"user",content:inputContent}],
      text:{format:{
        type:"json_schema",name:"nba2k_scoreboard_scan",strict:true,
        schema:{
          type:"object",additionalProperties:false,
          required:["home_team","away_team","team_a","team_b","home_score","away_score","team_a_score","team_b_score","game_date","orientation_confident","player_found","player_name","stats","field_confidence","notes","confidence"],
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
            field_confidence:{type:"object",additionalProperties:false,
              required:["home_score","away_score","minutes","points","rebounds","assists","steals","blocks","turnovers","fouls","fgm","fga","tpm","tpa","ftm","fta","plus_minus"],
              properties:{
                home_score:{type:"integer",minimum:0,maximum:100},away_score:{type:"integer",minimum:0,maximum:100},
                minutes:{type:"integer",minimum:0,maximum:100},points:{type:"integer",minimum:0,maximum:100},rebounds:{type:"integer",minimum:0,maximum:100},assists:{type:"integer",minimum:0,maximum:100},
                steals:{type:"integer",minimum:0,maximum:100},blocks:{type:"integer",minimum:0,maximum:100},turnovers:{type:"integer",minimum:0,maximum:100},fouls:{type:"integer",minimum:0,maximum:100},
                fgm:{type:"integer",minimum:0,maximum:100},fga:{type:"integer",minimum:0,maximum:100},tpm:{type:"integer",minimum:0,maximum:100},tpa:{type:"integer",minimum:0,maximum:100},
                ftm:{type:"integer",minimum:0,maximum:100},fta:{type:"integer",minimum:0,maximum:100},plus_minus:{type:"integer",minimum:0,maximum:100}
              }},
            notes:{type:"array",items:{type:"string"}},confidence:{type:"integer",minimum:0,maximum:100}
          }
        }
      }}
    });

    await logAiUsage({
      careerId:career.id,
      universeId:universe.id,
      gameId:b.expectedGameId||null,
      feature:"screenshot_scan",
      model:modelName,
      usage:response.usage as any,
      meta:{
        seasonId:universe.current_season_id,
        imageCount:images.length,
        precision,
        imageMeta:Array.isArray(b.imageMeta)?b.imageMeta.slice(0,2):[]
      }
    });

    const scan=JSON.parse(response.output_text);
    const teams=[scan.home_team,scan.away_team,scan.team_a,scan.team_b].filter(Boolean).map((x:string)=>normalizeAbbr(x));
    const pair=Array.from(new Set(teams)).slice(0,2);
    const date=isoDay(scan.game_date);

    let candidates:any[]=[];
    let matchedGameId:string|null=null;
    if(b.expectedGameId){
      const {data:expected}=await client.from("games")
        .select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
        .eq("id",String(b.expectedGameId))
        .maybeSingle();
      if(expected&&(!expected.universe_id||expected.universe_id===universe.id)){
        candidates=[{...expected,distance:0}];
        matchedGameId=expected.id;
      }
    }
    if(!matchedGameId){
      const center=date||career.universe_date;
      const d0=new Date(center);d0.setDate(d0.getDate()-14);
      const d1=new Date(center);d1.setDate(d1.getDate()+14);
      const {data:games}=await client.from("games")
        .select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
        .gte("game_day",d0.toISOString().slice(0,10))
        .lte("game_day",d1.toISOString().slice(0,10))
        .or(`universe_id.is.null,universe_id.eq.${universe.id}`)
        .or(`home_team_id.eq.${career.current_team_id},away_team_id.eq.${career.current_team_id}`)
        .order("game_date");

      candidates=(games||[]).filter((g:any)=>{
        const gp=[g.home?.abbreviation,g.away?.abbreviation];
        const teamMatch=pair.length===2&&pair.every((a:string)=>gp.includes(a));
        return teamMatch || pair.length===0;
      }).map((g:any)=>{
        const d=Math.abs(new Date(g.game_day).getTime()-new Date(center).getTime());
        return {...g,distance:d};
      }).sort((a:any,b:any)=>a.distance-b.distance).slice(0,5);

      if(candidates.length===1)matchedGameId=candidates[0].id;
      else if(candidates.length>1&&candidates[0].distance<candidates[1].distance)matchedGameId=candidates[0].id;
    }

    const stats:any={};
    for(const [k,v] of Object.entries(scan.stats||{}))stats[k]=n(v);

    await client.from("screenshot_scans").insert({
      career_id:career.id,game_id:matchedGameId,
      overall_confidence:Number(scan.confidence||0),
      field_confidence:scan.field_confidence||{},
      recognized_values:{...scan,stats},
      language:universe.language==="en"?"en":"de"
    });

    return NextResponse.json({
      ok:true,
      scan:{...scan,stats},
      matchedGameId,
      candidates:candidates.map((g:any)=>({id:g.id,game_day:g.game_day,home:g.home,away:g.away,stage:g.stage})),
      message:universe.language==="en"?(matchedGameId?"Screenshot recognized and matched to the game.":"Screenshot recognized. Please verify/select the game."):(matchedGameId?"Screenshot erkannt und Spiel zugeordnet.":"Screenshot erkannt. Bitte Spiel prüfen/auswählen.")
    });
  }catch(e:any){
    const raw=e instanceof Error?e.message:String(e);
    const code=String(e?.code||"");
    const quota=/insufficient_quota|credit|billing|quota/i.test(code+" "+raw);
    const rate=/rate.?limit|429/i.test(code+" "+raw);
    let message=raw;
    if(quota)message="OpenAI API-Guthaben/Quota ist aufgebraucht. Bitte Billing-Guthaben prüfen.";
    else if(rate)message="OpenAI Rate Limit erreicht. Bitte kurz warten und erneut versuchen.";
    return NextResponse.json({error:message},{status:quota?402:rate?429:apiStatus(e)});
  }
}
