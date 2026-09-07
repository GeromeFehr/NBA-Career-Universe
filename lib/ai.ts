import OpenAI from "openai";
import { db } from "@/lib/db";
import { performanceScore, headlineFacts } from "@/lib/stats";

const model = () => process.env.OPENAI_MODEL || "gpt-5.6-luna";
const hasAi = () => Boolean(process.env.OPENAI_API_KEY);

function fallbackCoverage(ctx:any) {
  const s=ctx.stat, p=ctx.career?.player_name || "Rookie", score=performanceScore(s), facts=headlineFacts(s);
  const lang=ctx.career?.universes?.language==="en"?"en":"de";
  const win=ctx.result==="win";
  if(lang==="en"){
    return [
      {outlet:"National Hoops Network",kind:"analysis",author_name:"Mara Cole",tone:"analytical",headline:`${p} forces a new conversation`,body:`The result was ${win?"a win":"a loss"}, but the bigger story was the total impact. Performance index: ${score}/100. Opponents now have real film to counter.`,virality:63},
      {outlet:"The Hardwood Wire",kind:"recap",author_name:"Jon Mercer",tone:"measured",headline:`Rookie watch: another statement from ${p}`,body:`${facts.join(", ")||"The overall impact"} stood out. The question now is whether this level survives the next wave of scouting adjustments.`,virality:58},
      {outlet:"Bay Beat",kind:"beat",author_name:"Avery Lin",tone:"local",headline:`Inside the locker room: all eyes on ${p}`,body:`${s.minutes} minutes, ${s.turnovers} turnovers and ${s.fouls} fouls show there are still pressure points behind the headline numbers.`,virality:51},
      {outlet:"Film Room Weekly",kind:"expert",author_name:"Tess Morgan",tone:"technical",headline:"The counter-scouting phase starts now",body:"The next test is not raw production. It is how the player responds when opponents take away first options and force tougher reads.",virality:47},
      {outlet:"Prime Time Debate",kind:"expert",author_name:"Darren Cole",tone:"skeptical",headline:"Slow down on the superstar talk",body:"One huge box score does not erase shot selection, turnovers or matchup context. The talent is obvious. The proof still has to stack up.",virality:76},
      {outlet:"HoopsTalk",kind:"social",author_name:"@HoopsTalkLive",tone:"hype",headline:`${p}. Absolutely ridiculous.`,body:`${s.points} PTS · ${s.rebounds} REB · ${s.assists} AST · ${s.blocks} BLK. The timeline is losing it.`,virality:91},
      {outlet:"No Easy Buckets",kind:"hater",author_name:"@NoEasyBuckets",tone:"critical",headline:"Nice numbers. Show me the next one.",body:`${s.fga} shots, ${s.turnovers} turnovers, ${s.fouls} fouls. I am not crowning anybody after one night.`,virality:83},
      {outlet:"Fourth Quarter Replies",kind:"social",author_name:"@BenchMobRadio",tone:"doubt",headline:"Are we ignoring the usage?",body:"The production is wild, but the workload is wild too. Efficiency and decision-making will matter when the defense tightens.",virality:72},
      {outlet:"Fan Section 12",kind:"fan",author_name:"@DubNationNorth",tone:"hype",headline:"This is must-watch basketball now",body:"Every possession feels like something can happen. The energy around this rookie run is getting ridiculous.",virality:79},
      {outlet:"Tunnel Cam",kind:"meme",author_name:"Nico Vale",tone:"culture",headline:"The league has a new appointment",body:"A normal regular-season game just turned into appointment viewing. Hype is officially part of the matchup.",virality:69},
      {outlet:"Cold Take Archive",kind:"hater",author_name:"@ReceiptCollector",tone:"hate",headline:"Save the screenshots",body:"If this falls off in two weeks, everyone pretending they knew all along is getting quoted back.",virality:88},
      {outlet:"Postgame Desk",kind:"expert",author_name:"Renee Ward",tone:"balanced",headline:"Brilliant night, still unanswered questions",body:"The ceiling looks absurd. The next layer is consistency, defensive discipline and decision-making under pressure.",virality:61}
    ];
  }
  return [
    {outlet:"National Hoops Network",kind:"analysis",author_name:"Mara Cole",tone:"analytical",headline:`${p} verschiebt die Diskussion`,body:`Das Ergebnis war ${win?"ein Sieg":"eine Niederlage"}, aber die größere Story war die Gesamtwirkung. Performance-Index: ${score}/100. Die Gegner haben jetzt echtes Film-Material für Anpassungen.`,virality:63},
    {outlet:"The Hardwood Wire",kind:"recap",author_name:"Jon Mercer",tone:"measured",headline:`Rookie-Watch: das nächste Ausrufezeichen von ${p}`,body:`${facts.join(", ")||"Die Gesamtwirkung"} stach heraus. Jetzt geht es darum, ob dieses Level auch gegen gezielte Gegenmaßnahmen hält.`,virality:58},
    {outlet:"Bay Beat",kind:"beat",author_name:"Avery Lin",tone:"local",headline:`Aus der Kabine: Alles dreht sich um ${p}`,body:`${s.minutes} Minuten, ${s.turnovers} Turnover und ${s.fouls} Fouls zeigen, dass hinter den Schlagzeilen weiterhin Ansatzpunkte liegen.`,virality:51},
    {outlet:"Film Room Weekly",kind:"expert",author_name:"Tess Morgan",tone:"technical",headline:"Jetzt beginnt das Counter-Scouting",body:"Der nächste Test ist nicht rohe Produktion. Entscheidend wird, wie er reagiert, wenn Gegner erste Optionen wegnehmen und schwierige Reads erzwingen.",virality:47},
    {outlet:"Prime Time Debate",kind:"expert",author_name:"Darren Cole",tone:"skeptical",headline:"Mit dem Superstar-Gerede mal langsam",body:"Ein riesiger Boxscore löscht Wurfauswahl, Turnover oder Matchup-Kontext nicht aus. Das Talent ist offensichtlich. Der Beweis muss sich trotzdem über Wochen stapeln.",virality:76},
    {outlet:"HoopsTalk",kind:"social",author_name:"@HoopsTalkLive",tone:"hype",headline:`${p}. Komplett absurd.`,body:`${s.points} PTS · ${s.rebounds} REB · ${s.assists} AST · ${s.blocks} BLK. Die Timeline dreht durch.`,virality:91},
    {outlet:"No Easy Buckets",kind:"hater",author_name:"@NoEasyBuckets",tone:"critical",headline:"Schöne Zahlen. Zeig mir das nächste Spiel.",body:`${s.fga} Würfe, ${s.turnovers} Turnover, ${s.fouls} Fouls. Ich kröne hier nach einer Nacht noch niemanden.`,virality:83},
    {outlet:"Fourth Quarter Replies",kind:"social",author_name:"@BenchMobRadio",tone:"doubt",headline:"Ignorieren wir gerade die Usage?",body:"Die Produktion ist wild, die Belastung aber genauso. Effizienz und Entscheidungen werden wichtiger, sobald die Defense enger wird.",virality:72},
    {outlet:"Fan Section 12",kind:"fan",author_name:"@DubNationNorth",tone:"hype",headline:"Das ist jetzt Pflichtprogramm",body:"Bei jedem Ballbesitz kann irgendetwas passieren. Der Hype um diesen Rookie-Run wird langsam lächerlich groß.",virality:79},
    {outlet:"Tunnel Cam",kind:"meme",author_name:"Nico Vale",tone:"culture",headline:"Die Liga hat einen neuen Termin",body:"Aus einem normalen Regular-Season-Spiel ist Pflichtprogramm geworden. Der Hype ist jetzt offiziell Teil des Matchups.",virality:69},
    {outlet:"Cold Take Archive",kind:"hater",author_name:"@ReceiptCollector",tone:"hate",headline:"Speichert euch die Screenshots",body:"Wenn das in zwei Wochen abfällt, werden alle, die jetzt so tun als hätten sie es immer gewusst, wieder zitiert.",virality:88},
    {outlet:"Postgame Desk",kind:"expert",author_name:"Renee Ward",tone:"balanced",headline:"Brillante Nacht, aber noch offene Fragen",body:"Die Ceiling sieht absurd aus. Die nächste Ebene heißt Konstanz, defensive Disziplin und Entscheidungen unter Druck.",virality:61}
  ];
}

export async function buildGameContext(statId:string) {
  const client=db();
  const {data:stat,error}=await client.from("player_game_stats")
    .select("*,career_profiles(*,universes(language)),games(*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)),team:teams(*)")
    .eq("id",statId).single();
  if (error || !stat) throw new Error("Stat line not found");
  const [{data:notables},{data:recent},{data:arcs},{data:injuries},{data:interest},{data:allStats},{data:universeGame}] = await Promise.all([
    client.from("game_notables").select("*").eq("career_id",stat.career_id).eq("game_id",stat.game_id),
    client.from("media_posts").select("outlet,kind,headline,body,tone").eq("career_id",stat.career_id).order("created_at",{ascending:false}).limit(18),
    client.from("story_arcs").select("*").eq("career_id",stat.career_id).eq("status","active").limit(8),
    client.from("injuries").select("*").eq("career_id",stat.career_id).order("start_date",{ascending:false}).limit(5),
    client.from("trade_interest").select("*,teams(*)").eq("career_id",stat.career_id).order("interest_score",{ascending:false}).limit(8),
    client.from("player_game_stats").select("*").eq("career_id",stat.career_id).order("created_at"),
    client.from("universe_games").select("*").eq("universe_id",stat.career_profiles.universe_id).eq("game_id",stat.game_id).maybeSingle()
  ]);
  const g={...stat.games,status:universeGame?.status||"scheduled",home_score:universeGame?.home_score??null,away_score:universeGame?.away_score??null};
  const myTeam=stat.team_id;
  const won = g.status==="completed" && (
    (g.home_team_id===myTeam && Number(g.home_score)>Number(g.away_score)) ||
    (g.away_team_id===myTeam && Number(g.away_score)>Number(g.home_score))
  );
  return {stat,career:stat.career_profiles,game:g,notables:notables||[],recent:recent||[],arcs:arcs||[],injuries:injuries||[],interest:interest||[],history:allStats||[],result:g.status==="completed"?(won?"win":"loss"):"unknown"};
}

export async function generateGameMedia(statId:string) {
  const ctx=await buildGameContext(statId);
  let items:any[] = [];
  if (hasAi()) {
    const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const prompt=`You are the editorial engine for a PRIVATE fictional NBA MyNBA career universe.
Write exclusively in ${ctx.career?.universes?.language==="en"?"English":"German"}. Treat supplied game/career data as canon. Never invent exact stats for another player unless present in NOTABLES.
Create exactly 12 DISTINCT pieces after every game:
- 2 traditional media pieces (analysis/recap/beat)
- 3 expert or TV analyst opinions, with at least one skeptical or critical voice
- 3 social-media reactions from fictional accounts
- 1 fan reaction
- 2 hater/doubt posts that can be harsh, dismissive or provocative without slurs or threats
- 1 meme/culture post.
Do not make everyone agree. Praise, skepticism, doubt, criticism and sports-fan hate should coexist when plausible.
The writing must not feel templated. Change sentence rhythm, angle, intensity and what stat you focus on. Some items may focus on fouls, efficiency, blocks, injury, matchup, pressure, minutes, turnovers, team result or historical context.
Do not repeat recent headlines or phrasings. Do not claim real-world news happened; this is a fictional MyNBA universe.
If the player is a 99 OVR rookie, coverage may treat that as extraordinary, but criticism can still be credible.
Return JSON only.

CANON:
${JSON.stringify({game:ctx.game,stat:ctx.stat,career:ctx.career,notables:ctx.notables,result:ctx.result,activeStoryArcs:ctx.arcs,injuries:ctx.injuries,tradeInterest:ctx.interest})}

RECENT COVERAGE TO AVOID COPYING:
${JSON.stringify(ctx.recent)}

RANDOM EDITORIAL SEED:
${crypto.randomUUID()}`;

    const response=await ai.responses.create({
      model:model(),
      input:prompt,
      store:false,
      text:{format:{
        type:"json_schema",name:"game_media_pack",strict:true,
        schema:{
          type:"object",additionalProperties:false,required:["items"],
          properties:{items:{type:"array",minItems:12,maxItems:12,items:{
            type:"object",additionalProperties:false,
            required:["outlet","kind","author_name","tone","headline","body","virality"],
            properties:{
              outlet:{type:"string"},kind:{type:"string"},author_name:{type:"string"},
              tone:{type:"string"},headline:{type:"string"},body:{type:"string"},
              virality:{type:"integer",minimum:0,maximum:100}
            }
          }}}
        }
      }}
    });
    items=JSON.parse(response.output_text).items;
  } else {
    items=fallbackCoverage(ctx);
  }

  const client=db();
  const rows=items.map((x:any)=>({
    career_id:ctx.stat.career_id, game_id:ctx.stat.game_id, player_stat_id:ctx.stat.id,
    outlet:x.outlet, kind:x.kind, author_name:x.author_name, tone:x.tone,
    headline:x.headline, body:x.body, virality:Number(x.virality||50),
    generation_source:hasAi() ? "openai" : "fallback"
  }));
  const {data,error}=await client.from("media_posts").insert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function generateWorldPulse(careerId:string) {
  const client=db();
  const {data:career}=await client.from("career_profiles").select("*,current_team:teams(*),universes(language)").eq("id",careerId).single();
  if (!career) throw new Error("Career not found");
  const [{data:stats},{data:offers},{data:arcs},{data:nextGames},{data:recent}] = await Promise.all([
    client.from("player_game_stats").select("*").eq("career_id",careerId).order("created_at",{ascending:false}).limit(10),
    client.from("trade_offers").select("*,from_team:teams!trade_offers_from_team_id_fkey(*),to_team:teams!trade_offers_to_team_id_fkey(*)").eq("career_id",careerId).eq("status","pending").limit(5),
    client.from("story_arcs").select("*").eq("career_id",careerId).eq("status","active"),
    client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").gte("game_day",career.universe_date||"1900-01-01").order("game_date").limit(25),
    client.from("media_posts").select("headline,body").eq("career_id",careerId).order("created_at",{ascending:false}).limit(15)
  ]);
  const relevant=(nextGames||[]).filter((g:any)=>g.home_team_id===career.current_team_id||g.away_team_id===career.current_team_id).slice(0,3);

  let items:any[]=[];
  if (hasAi()) {
    const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const prompt=`Generate a ${career?.universes?.language==="en"?"English":"German"} daily media pulse for a fictional MyNBA career world. Four varied items, no duplicated angles.
Use only supplied canon. You may discuss upcoming matchup pressure, trade chatter, award momentum, team fit, injuries or a developing story arc.
Do not invent exact stats for unprovided players. Return JSON only.
${JSON.stringify({career,stats,offers,arcs,nextGames:relevant,recent})}`;
    const r=await ai.responses.create({
      model:model(),input:prompt,store:false,
      text:{format:{type:"json_schema",name:"world_pulse",strict:true,schema:{
        type:"object",additionalProperties:false,required:["items"],properties:{items:{type:"array",minItems:4,maxItems:4,items:{
          type:"object",additionalProperties:false,required:["outlet","kind","author_name","tone","headline","body","virality"],
          properties:{outlet:{type:"string"},kind:{type:"string"},author_name:{type:"string"},tone:{type:"string"},headline:{type:"string"},body:{type:"string"},virality:{type:"integer"}}
        }}}
      }}}
    });
    items=JSON.parse(r.output_text).items;
  } else {
    const en=career?.universes?.language==="en";
    items=en?[
      {outlet:"League Desk",kind:"analysis",author_name:"Staff",tone:"analytical",headline:"The next test is coming",body:`For ${career.player_name}, the focus shifts to the next stretch of the schedule.`,virality:52},
      {outlet:"Trade Signal",kind:"rumor",author_name:"R. Fields",tone:"speculative",headline:"Scouts are still watching",body:"The form has league-wide attention. Real movement still depends on actual offers in the Trade Center.",virality:61},
      {outlet:"HoopsTalk",kind:"social",author_name:"@HoopsTalkLive",tone:"hype",headline:"What is the ceiling?",body:"The rookie discussion stopped being just a rookie discussion a while ago.",virality:74},
      {outlet:"Film Room Weekly",kind:"expert",author_name:"Tess Morgan",tone:"technical",headline:"Counter-scouting starts now",body:"After standout performances, opponents will test adjustments. That is where the next storyline begins.",virality:45}
    ]:[
      {outlet:"League Desk",kind:"analysis",author_name:"Staff",tone:"analytical",headline:"Der nächste Test rückt näher",body:`Für ${career.player_name} verschiebt sich der Fokus auf den nächsten Abschnitt des Spielplans.`,virality:52},
      {outlet:"Trade Signal",kind:"rumor",author_name:"R. Fields",tone:"speculative",headline:"Scouts bleiben aufmerksam",body:"Die Formkurve sorgt ligaweit für Aufmerksamkeit. Konkrete Bewegung hängt aber von echten Angeboten im Trade Center ab.",virality:61},
      {outlet:"HoopsTalk",kind:"social",author_name:"@HoopsTalkLive",tone:"hype",headline:"Was ist die Ceiling?",body:"Die Rookie-Debatte ist längst nicht mehr nur eine Rookie-Debatte.",virality:74},
      {outlet:"Film Room Weekly",kind:"expert",author_name:"Tess Morgan",tone:"technical",headline:"Jetzt beginnt das Counter-Scouting",body:"Nach auffälligen Leistungen werden Gegner Anpassungen testen. Genau dort beginnt die nächste Storyline.",virality:45}
    ];
  }
  const {data,error}=await client.from("media_posts").insert(items.map((x:any)=>({...x,career_id:careerId,generation_source:hasAi()?"openai":"fallback"}))).select();
  if(error) throw error;
  return data||[];
}

export async function generateTradeMarket(careerId:string) {
  const client=db();
  const [{data:career},{data:teams},{data:stats},{data:recent}] = await Promise.all([
    client.from("career_profiles").select("*,current_team:teams(*),universes(language)").eq("id",careerId).single(),
    client.from("teams").select("*").eq("active",true),
    client.from("player_game_stats").select("*").eq("career_id",careerId).order("created_at",{ascending:false}).limit(12),
    client.from("trade_interest").select("*,teams(*)").eq("career_id",careerId).order("created_at",{ascending:false}).limit(20)
  ]);
  if(!career) throw new Error("Career not found");
  const eligible=(teams||[]).filter((t:any)=>t.id!==career.current_team_id);
  let picks:any[]=[];
  if (hasAi()) {
    const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const prompt=`You run the trade rumor engine for a fictional NBA MyNBA universe. Write all user-facing text in ${career?.universes?.language==="en"?"English":"German"}.
The user-controlled player is rated ${career.overall} OVR. Generate exactly 5 plausible interested teams from the supplied list.
A 99 OVR rookie is an ultra-premium asset: offers must be massive. Since exact live rosters and future pick ownership are NOT supplied, DO NOT invent named players or exact pick years. Describe packages generically (e.g. "young starter + 3 first-round picks + swap").
Each offer needs interest_score 0-100, fairness_score 0-100, rationale, package_summary and pressure ("low","medium","high").
Vary interest; not every team should be desperate.
Return JSON only.
CAREER=${JSON.stringify(career)}
RECENT_STATS=${JSON.stringify(stats)}
TEAMS=${JSON.stringify(eligible.map((t:any)=>({id:t.id,abbreviation:t.abbreviation,city:t.city,name:t.name,conference:t.conference})))}
RECENT_INTEREST=${JSON.stringify(recent)}`;
    const r=await ai.responses.create({
      model:model(),input:prompt,store:false,
      text:{format:{type:"json_schema",name:"trade_market",strict:true,schema:{
        type:"object",additionalProperties:false,required:["offers"],properties:{offers:{type:"array",minItems:5,maxItems:5,items:{
          type:"object",additionalProperties:false,
          required:["team_id","interest_score","fairness_score","rationale","package_summary","pressure"],
          properties:{team_id:{type:"string"},interest_score:{type:"integer"},fairness_score:{type:"integer"},rationale:{type:"string"},package_summary:{type:"string"},pressure:{type:"string",enum:["low","medium","high"]}}
        }}}
      }}}
    });
    picks=JSON.parse(r.output_text).offers;
  } else {
    const en=career?.universes?.language==="en";
    const sorted=[...eligible].sort((a:any,b:any)=>a.abbreviation.localeCompare(b.abbreviation)).slice(0,5);
    picks=sorted.map((t:any,i:number)=>({
      team_id:t.id,interest_score:82-i*5,fairness_score:86-i*3,
      rationale:en
        ?`${t.city} is evaluating whether a franchise-level talent can immediately change the team's timeline.`
        :`${t.city} prüft, ob ein Franchise-Level-Talent den Zeitplan des Teams sofort verändert.`,
      package_summary:en
        ?"Young starter + multiple unprotected first-round picks + at least one pick swap"
        :"Junger Starter + mehrere ungeschützte First-Round-Picks + mindestens ein Pick-Swap",
      pressure:i<2?"high":"medium"
    }));
  }

  const inserted:any[]=[];
  for(const p of picks) {
    await client.from("trade_interest").upsert({
      career_id:careerId,team_id:p.team_id,interest_score:p.interest_score,rationale:p.rationale,status:"active"
    },{onConflict:"career_id,team_id"});
    const {data,error}=await client.from("trade_offers").insert({
      career_id:careerId,from_team_id:career.current_team_id,to_team_id:p.team_id,
      interest_score:p.interest_score,fairness_score:p.fairness_score,package_summary:p.package_summary,
      rationale:p.rationale,pressure:p.pressure,status:"pending",generated_by:hasAi()?"openai":"fallback"
    }).select("*,to_team:teams!trade_offers_to_team_id_fkey(*)").single();
    if(error) throw error;
    inserted.push(data);
  }
  return inserted;
}
