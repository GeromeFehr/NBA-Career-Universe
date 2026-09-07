import {db} from "@/lib/db";

type Lang="de"|"en";
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
const pct=(m:number,a:number)=>a>0?m/a:0;
const isPlayoff=(stage:any)=>/playoff|play-in|conference|final/i.test(String(stage||""));
const letter=(n:number)=>n>=97?"A+":n>=93?"A":n>=90?"A-":n>=87?"B+":n>=83?"B":n>=80?"B-":n>=77?"C+":n>=73?"C":n>=70?"C-":n>=67?"D+":n>=63?"D":n>=60?"D-":"F";

export const PERSONAS=[
  {key:"mara",name:"Mara Cole",role:"National Hoops Network",base:"balanced"},
  {key:"tess",name:"Tess Morgan",role:"Film Room Weekly",base:"technical"},
  {key:"darren",name:"Darren Cole",role:"Prime Time Debate",base:"skeptic"},
  {key:"hoopstalk",name:"@HoopsTalkLive",role:"Social",base:"hype"},
  {key:"noeasy",name:"@NoEasyBuckets",role:"Social",base:"hater"},
  {key:"receipts",name:"@ReceiptCollector",role:"Social",base:"hater"},
  {key:"benchmob",name:"@BenchMobRadio",role:"Social",base:"contrarian"}
];

async function getLang(careerId:string):Promise<Lang>{
  const client=db();
  const {data}=await client.from("career_profiles").select("universes(language)").eq("id",careerId).single();
  return data?.universes?.language==="en"?"en":"de";
}

export async function calculateTrends(careerId:string,language?:Lang){
  const client=db(),lang=language||await getLang(careerId);
  const {data:rows}=await client.from("player_game_stats").select("*").eq("career_id",careerId).eq("appearance_status","played").order("created_at",{ascending:false}).limit(20);
  const s=rows||[];
  const avg=(arr:any[],k:string)=>arr.length?arr.reduce((a,r)=>a+Number(r[k]||0),0)/arr.length:0;
  const group=(n:number)=>s.slice(0,n);
  const last5=group(5),prev5=s.slice(5,10),last10=group(10);
  const metric=(k:string)=>({
    last5:avg(last5,k),last10:avg(last10,k),previous5:avg(prev5,k),
    direction:avg(last5,k)>avg(prev5,k)+.4?"up":avg(last5,k)<avg(prev5,k)-.4?"down":"flat"
  });
  return {
    language:lang,
    games:s.length,
    points:metric("points"),rebounds:metric("rebounds"),assists:metric("assists"),
    steals:metric("steals"),blocks:metric("blocks"),turnovers:metric("turnovers"),
    fg:{
      last5:last5.reduce((m,r)=>m+Number(r.fgm||0),0)/Math.max(1,last5.reduce((m,r)=>m+Number(r.fga||0),0)),
      last10:last10.reduce((m,r)=>m+Number(r.fgm||0),0)/Math.max(1,last10.reduce((m,r)=>m+Number(r.fga||0),0))
    }
  };
}

async function ensureGoals(career:any,seasonId:string,lang:Lang){
  const client=db();
  const goals=lang==="en"?[
    ["PPG_25","Average 25+ PPG",25],
    ["TRIPLE_5","Record 5 triple-doubles",5],
    ["FIFTY","Score 50+ in a game",1],
    ["GAMES_70","Play 70 games",70],
    ["PLAYOFFS","Reach the playoffs",1]
  ]:[
    ["PPG_25","Mindestens 25 PPG im Schnitt",25],
    ["TRIPLE_5","5 Triple-Doubles schaffen",5],
    ["FIFTY","Ein 50-Punkte-Spiel schaffen",1],
    ["GAMES_70","70 Spiele absolvieren",70],
    ["PLAYOFFS","Die Playoffs erreichen",1]
  ];
  for(const [code,title,target] of goals){
    await client.from("season_goals").upsert({
      career_id:career.id,season_id:seasonId,language:lang,code,title,target,progress:0,status:"active"
    },{onConflict:"career_id,season_id,code,language"});
  }
}

async function updateGoals(career:any,seasonId:string,lang:Lang){
  const client=db();
  await ensureGoals(career,seasonId,lang);
  const {data:stats}=await client.from("player_game_stats")
    .select("*,games!inner(season_id,stage)")
    .eq("career_id",career.id).eq("games.season_id",seasonId);
  const rows=(stats||[]).filter((r:any)=>r.appearance_status==="played");
  const games=rows.length;
  const ppg=games?rows.reduce((a:any,r:any)=>a+Number(r.points||0),0)/games:0;
  const triples=rows.filter((r:any)=>[r.points,r.rebounds,r.assists,r.steals,r.blocks].filter((x:any)=>Number(x)>=10).length>=3).length;
  const fifty=rows.some((r:any)=>Number(r.points)>=50)?1:0;
  const playoffs=rows.some((r:any)=>isPlayoff(r.games?.stage))?1:0;
  const values:any={PPG_25:ppg,TRIPLE_5:triples,FIFTY:fifty,GAMES_70:games,PLAYOFFS:playoffs};
  const {data:goals}=await client.from("season_goals").select("*").eq("career_id",career.id).eq("season_id",seasonId).eq("language",lang);
  for(const g of goals||[]){
    const progress=Number(values[g.code]??0);
    await client.from("season_goals").update({
      progress,status:progress>=Number(g.target)?"completed":"active",updated_at:new Date().toISOString()
    }).eq("id",g.id);
  }
}

async function updateRecords(careerId:string,seasonId:string,game:any,stat:any,lang:Lang){
  const client=db();
  const categories:any[]=[
    ["points",Number(stat.points||0),lang==="en"?"Points":"Punkte"],
    ["rebounds",Number(stat.rebounds||0),lang==="en"?"Rebounds":"Rebounds"],
    ["assists",Number(stat.assists||0),lang==="en"?"Assists":"Assists"],
    ["steals",Number(stat.steals||0),lang==="en"?"Steals":"Steals"],
    ["blocks",Number(stat.blocks||0),lang==="en"?"Blocks":"Blocks"],
    ["threes",Number(stat.tpm||0),lang==="en"?"Three-pointers made":"Getroffene Dreier"]
  ];
  for(const scope of ["career","season",...(isPlayoff(game.stage)?["playoffs"]:[])]){
    for(const [cat,value,label] of categories){
      const q=client.from("career_records").select("*").eq("career_id",careerId).eq("scope",scope).eq("category",cat).eq("language",lang);
      if(scope==="career")q.is("season_id",null);else q.eq("season_id",seasonId);
      const {data:old}=await q.maybeSingle();
      if(!old||value>Number(old.value)){
        const payload={career_id:careerId,season_id:scope==="career"?null:seasonId,scope,category:cat,value,game_id:game.id,label,language:lang,updated_at:new Date().toISOString()};
        if(old)await client.from("career_records").update(payload).eq("id",old.id);
        else await client.from("career_records").insert(payload);
      }
    }
  }
}

async function updateRivalry(career:any,game:any,stat:any,result:"win"|"loss"|"unknown",lang:Lang){
  const client=db();
  const opponent=game.home_team_id===stat.team_id?game.away_team_id:game.home_team_id;
  if(!opponent)return;
  const {data:team}=await client.from("teams").select("*").eq("id",opponent).single();
  const {data:old}=await client.from("rivalries").select("*").eq("career_id",career.id).eq("opponent_team_id",opponent).maybeSingle();
  const dramatic=Math.abs(Number(game.home_score||0)-Number(game.away_score||0))<=5?8:0;
  const heatDelta=5+Math.min(20,Math.floor(Number(stat.points||0)/8))+dramatic+Number(stat.technical_fouls||0)*6+Number(stat.flagrant_fouls||0)*8;
  const reason=lang==="en"
    ?`${old?.meetings?old.meetings+1:1} career meeting(s); latest: ${stat.points} PTS, ${result} vs ${team?.abbreviation||"opponent"}.`
    :`${old?.meetings?old.meetings+1:1} Karriere-Duell(e); zuletzt: ${stat.points} PTS, ${result==="win"?"Sieg":result==="loss"?"Niederlage":"offen"} gegen ${team?.abbreviation||"Gegner"}.`;
  const payload={
    career_id:career.id,opponent_team_id:opponent,rivalry_type:"team",
    heat:clamp(Number(old?.heat||20)+heatDelta),
    wins:Number(old?.wins||0)+(result==="win"?1:0),
    losses:Number(old?.losses||0)+(result==="loss"?1:0),
    meetings:Number(old?.meetings||0)+1,reason,status:"active",last_game_id:game.id,updated_at:new Date().toISOString()
  };
  if(old)await client.from("rivalries").update(payload).eq("id",old.id);else await client.from("rivalries").insert(payload);

  await client.from("fanbase_metrics").upsert({
    career_id:career.id,segment:"opponent_fans",team_id:opponent,
    approval:clamp(45-Math.floor(Number(stat.points||0)/4),0,100),
    heat:clamp((old?.heat||20)+heatDelta),updated_at:new Date().toISOString()
  },{onConflict:"career_id,segment,team_id"});
}

function gradeGame(stat:any){
  const fg=pct(Number(stat.fgm||0),Number(stat.fga||0));
  const scoring=clamp(38+Number(stat.points||0)*1.35+(fg-.45)*65);
  const playmaking=clamp(45+Number(stat.assists||0)*5-Number(stat.turnovers||0)*7);
  const defense=clamp(42+Number(stat.steals||0)*8+Number(stat.blocks||0)*7+Number(stat.rebounds||0)*1.1);
  const efficiency=clamp(50+(fg-.45)*90+Number(stat.plus_minus||0)*.45-Number(stat.turnovers||0)*3);
  const discipline=clamp(92-Number(stat.fouls||0)*7-Number(stat.technical_fouls||0)*12-Number(stat.flagrant_fouls||0)*18-Number(stat.turnovers||0)*2);
  const overall=clamp(scoring*.3+playmaking*.19+defense*.22+efficiency*.18+discipline*.11);
  return {overall,overall_grade:letter(overall),scoring,playmaking,defense,efficiency,discipline};
}

async function updateReputation(career:any,stat:any,result:string,grade:any){
  const client=db();
  const {data:old}=await client.from("universe_reputation").select("*").eq("career_id",career.id).maybeSingle();
  const x=old||{league_reputation:50,star_power:50,media_hype:50,fan_approval:50,expert_respect:50,hater_heat:35,cultural_impact:35};
  const huge=Number(stat.points)>=40||Number(stat.blocks)>=8||grade.overall>=92;
  const delta=(grade.overall-75)/8+(result==="win"?2:-1);
  await client.from("universe_reputation").upsert({
    career_id:career.id,
    league_reputation:clamp(Number(x.league_reputation)+delta),
    star_power:clamp(Number(x.star_power)+delta+(huge?4:0)),
    media_hype:clamp(Number(x.media_hype)+delta*1.4+(huge?7:0)),
    fan_approval:clamp(Number(x.fan_approval)+delta+(result==="win"?2:-2)),
    expert_respect:clamp(Number(x.expert_respect)+(grade.efficiency-72)/12+(grade.discipline-70)/18),
    hater_heat:clamp(Number(x.hater_heat)+(huge?5:0)+(Number(stat.fga||0)>30?3:0)),
    cultural_impact:clamp(Number(x.cultural_impact)+(huge?4:1)),
    updated_at:new Date().toISOString()
  },{onConflict:"career_id"});

  await client.from("fanbase_metrics").upsert({
    career_id:career.id,segment:"current_team",team_id:career.current_team_id,
    approval:clamp(Number(x.fan_approval)+delta+(result==="win"?5:-3)),heat:15,updated_at:new Date().toISOString()
  },{onConflict:"career_id,segment,team_id"});
  await client.from("fanbase_metrics").upsert({
    career_id:career.id,segment:"nba_overall",team_id:null,
    approval:clamp(Number(x.league_reputation)+delta),heat:clamp(Number(x.hater_heat)+(huge?3:0)),updated_at:new Date().toISOString()
  },{onConflict:"career_id,segment,team_id"});
}

async function updatePersonas(career:any,game:any,stat:any,grade:any,lang:Lang){
  const client=db();
  for(const p of PERSONAS){
    let sentiment=0,stance="neutral",memory="";
    if(p.base==="hater"){sentiment=-45;stance="critical";memory=lang==="en"
      ?`After ${stat.points} points, still refuses to buy the hype and points to ${stat.turnovers} turnovers / ${stat.fga} shots.`
      :`Trotz ${stat.points} Punkten glaubt er den Hype nicht und verweist auf ${stat.turnovers} Turnover / ${stat.fga} Würfe.`;}
    else if(p.base==="skeptic"){sentiment=grade.overall>=90?10:-15;stance=grade.overall>=90?"reluctantly impressed":"skeptical";memory=lang==="en"
      ?`Wants a larger sample. Latest grade: ${grade.overall_grade}; discipline ${grade.discipline}/100.`
      :`Will eine größere Stichprobe sehen. Letzte Note: ${grade.overall_grade}; Disziplin ${grade.discipline}/100.`;}
    else if(p.base==="hype"){sentiment=70;stance="supportive";memory=lang==="en"
      ?`Loved the latest box score: ${stat.points} PTS, ${stat.rebounds} REB, ${stat.assists} AST.`
      :`Feiert den letzten Boxscore: ${stat.points} PTS, ${stat.rebounds} REB, ${stat.assists} AST.`;}
    else if(p.base==="technical"){sentiment=25;stance="analytical";memory=lang==="en"
      ?`Tracking efficiency (${grade.efficiency}/100), playmaking (${grade.playmaking}/100) and defensive reads (${grade.defense}/100).`
      :`Beobachtet Effizienz (${grade.efficiency}/100), Playmaking (${grade.playmaking}/100) und defensive Reads (${grade.defense}/100).`;}
    else{sentiment=35;stance="balanced";memory=lang==="en"
      ?`Latest performance graded ${grade.overall_grade}. Keeps the long-term view.`
      :`Letzte Leistung mit ${grade.overall_grade} bewertet. Behält die langfristige Perspektive.`;}
    await client.from("persona_memories").upsert({
      career_id:career.id,persona_key:p.key,persona_name:p.name,role:p.role,stance,sentiment,memory,
      source_game_id:game.id,language:lang,updated_at:new Date().toISOString()
    },{onConflict:"career_id,persona_key,language"});
  }
}

async function updateStoryArcs(career:any,game:any,stat:any,grade:any,lang:Lang){
  const client=db();
  const title=Number(stat.points)>=40
    ?(lang==="en"?"Can anyone slow this run down?":"Wer kann diesen Lauf stoppen?")
    :grade.overall<70
      ?(lang==="en"?"First real adversity":"Die erste echte Bewährungsprobe")
      :(lang==="en"?"The counter-scouting phase":"Die Counter-Scouting-Phase");
  const category=Number(stat.points)>=40?"hype":grade.overall<70?"adversity":"performance";
  const summary=lang==="en"
    ?`Latest game: ${stat.points} PTS, grade ${grade.overall_grade}. The next games will decide whether the narrative grows or flips.`
    :`Letztes Spiel: ${stat.points} PTS, Note ${grade.overall_grade}. Die nächsten Partien entscheiden, ob das Narrativ wächst oder kippt.`;
  const {data:existing}=await client.from("story_arcs").select("*").eq("career_id",career.id).eq("language",lang).eq("category",category).eq("status","active").maybeSingle();
  if(existing){
    const intensity=clamp(Number(existing.intensity)+(grade.overall>=85?8:-5));
    await client.from("story_arcs").update({title,summary,intensity,metadata:{...(existing.metadata||{}),last_game_id:game.id},}).eq("id",existing.id);
  }else{
    await client.from("story_arcs").insert({career_id:career.id,category,title,summary,status:"active",intensity:clamp(55+(grade.overall-75)/2),started_on:game.game_day,metadata:{last_game_id:game.id},language:lang});
  }
  const {data:oldArcs}=await client.from("story_arcs").select("*").eq("career_id",career.id).eq("language",lang).eq("status","active").order("created_at");
  if((oldArcs||[]).length>5){
    for(const arc of (oldArcs||[]).slice(0,(oldArcs||[]).length-5)){
      await client.from("story_arcs").update({status:"resolved",resolved_on:game.game_day,summary:lang==="en"?`${arc.summary} Narrative closed as the season moved on.`:`${arc.summary} Das Narrativ wurde im weiteren Saisonverlauf abgeschlossen.`}).eq("id",arc.id);
    }
  }
}

async function createInterview(career:any,game:any,stat:any,lang:Lang){
  const client=db();
  const {data:exists}=await client.from("interviews").select("id").eq("career_id",career.id).eq("game_id",game.id).eq("language",lang).maybeSingle();
  if(exists)return;
  const question=Number(stat.points)>=35
    ?(lang==="en"?"The hype is getting louder every night. How do you handle it?":"Der Hype wird nach jedem Spiel lauter. Wie gehst du damit um?")
    :(lang==="en"?"What do you take away from tonight's performance?":"Was nimmst du aus der heutigen Leistung mit?");
  const options=lang==="en"?[
    {id:"confident",label:"They can keep talking. I know what I can do.",impact:{hype:5,expert:-1,hater:6}},
    {id:"team",label:"I only care about winning with this team.",impact:{fans:6,expert:3,hype:-1}},
    {id:"film",label:"Watch the film. There is still a lot to improve.",impact:{expert:6,hype:-2}},
    {id:"silent",label:"No comment.",impact:{hype:1,hater:2}}
  ]:[
    {id:"confident",label:"Die können weiterreden. Ich weiß, was ich kann.",impact:{hype:5,expert:-1,hater:6}},
    {id:"team",label:"Mich interessiert nur, mit diesem Team zu gewinnen.",impact:{fans:6,expert:3,hype:-1}},
    {id:"film",label:"Schaut euch das Tape an. Da gibt es noch viel zu verbessern.",impact:{expert:6,hype:-2}},
    {id:"silent",label:"Kein Kommentar.",impact:{hype:1,hater:2}}
  ];
  await client.from("interviews").insert({career_id:career.id,game_id:game.id,interview_date:game.game_day,question,options,language:lang,status:"open"});
}

export async function ensurePregameCoverage(career:any,universe:any,game:any,lang:Lang){
  const client=db();
  const {data:existing}=await client.from("pregame_coverage").select("*").eq("career_id",career.id).eq("game_id",game.id).eq("language",lang).maybeSingle();
  if(existing)return existing;
  const opponentId=game.home_team_id===career.current_team_id?game.away_team_id:game.home_team_id;
  const {data:opp}=await client.from("teams").select("*").eq("id",opponentId).maybeSingle();
  const {data:rep}=await client.from("universe_reputation").select("*").eq("career_id",career.id).maybeSingle();
  const {data:rivalry}=await client.from("rivalries").select("*").eq("career_id",career.id).eq("opponent_team_id",opponentId).maybeSingle();
  const heat=Number(rivalry?.heat||20),respect=Number(rep?.expert_respect||50);
  const headline=lang==="en"
    ?`${career.current_team?.abbreviation} vs ${opp?.abbreviation}: pressure rises around ${career.player_name}`
    :`${career.current_team?.abbreviation} gegen ${opp?.abbreviation}: Der Druck rund um ${career.player_name} steigt`;
  const key=heat>=60
    ?(lang==="en"?"Does the rivalry produce another flashpoint?":"Gibt es im Rivalry-Duell den nächsten Aufreger?")
    :(lang==="en"?"Can the recent production survive a new defensive game plan?":"Hält die aktuelle Produktion auch gegen einen neuen defensiven Gameplan?");
  const picks=[
    {name:"Mara Cole",pick:respect>=48?career.current_team?.abbreviation:opp?.abbreviation,reason:lang==="en"?"Form and total impact":"Form und Gesamtwirkung"},
    {name:"Tess Morgan",pick:career.current_team?.abbreviation,reason:lang==="en"?"Matchup flexibility":"Matchup-Flexibilität"},
    {name:"Darren Cole",pick:opp?.abbreviation,reason:lang==="en"?"Wants proof against adjustments":"Will den Beweis gegen Anpassungen sehen"}
  ];
  const body=lang==="en"
    ?`Rivalry heat: ${heat}/100. Expert respect: ${respect}/100. The matchup is framed around how the defense changes the reads.`
    :`Rivalry-Heat: ${heat}/100. Experten-Respekt: ${respect}/100. Im Mittelpunkt steht, wie die Defense die Reads verändert.`;
  const {data}=await client.from("pregame_coverage").insert({career_id:career.id,game_id:game.id,language:lang,headline,body,key_question:key,expert_picks:picks}).select("*").single();
  return data;
}

async function nextGame(career:any,universe:any,date:string){
  const client=db();
  const {data}=await client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)")
    .gte("game_day",date)
    .or(`home_team_id.eq.${career.current_team_id},away_team_id.eq.${career.current_team_id}`)
    .or(`universe_id.is.null,universe_id.eq.${universe.id}`)
    .order("game_date").limit(6);
  if(!(data||[]).length)return null;
  const ids=(data||[]).map((g:any)=>g.id);
  const {data:done}=await client.from("universe_games").select("game_id,status").eq("universe_id",universe.id).in("game_id",ids);
  const finished=new Set((done||[]).filter((r:any)=>r.status==="completed").map((r:any)=>r.game_id));
  return (data||[]).find((g:any)=>!finished.has(g.id))||null;
}

async function updateLegacy(careerId:string){
  const client=db();
  const [{data:stats},{data:trophies},{data:awards},{data:rep},{data:records}]=await Promise.all([
    client.from("player_game_stats").select("points").eq("career_id",careerId).eq("appearance_status","played"),
    client.from("trophies").select("*").eq("career_id",careerId),
    client.from("award_snapshots").select("*").eq("career_id",careerId).eq("rank",1),
    client.from("universe_reputation").select("*").eq("career_id",careerId).maybeSingle(),
    client.from("career_records").select("*").eq("career_id",careerId).eq("scope","career")
  ]);
  const games=(stats||[]).length,points=(stats||[]).reduce((a:any,r:any)=>a+Number(r.points||0),0);
  const rings=(trophies||[]).filter((t:any)=>/champion/i.test(t.trophy_type+" "+t.title)).length;
  const mvps=(awards||[]).filter((a:any)=>String(a.award).toLowerCase()==="mvp").length;
  const awardsWon=(awards||[]).length;
  const score=clamp(games*.035+points/700+rings*13+mvps*10+awardsWon*3+Number(rep?.star_power||50)*.12+Number(rep?.expert_respect||50)*.08);
  const breakdown={games,points,rings,mvps,awardsWon,star_power:rep?.star_power||50,expert_respect:rep?.expert_respect||50,career_records:(records||[]).length};
  await client.from("legacy_scores").upsert({career_id:careerId,score,breakdown,updated_at:new Date().toISOString()},{onConflict:"career_id"});
  return {score,breakdown};
}

export async function updateUniverseAfterGame({career,universe,game,stat,result}:{career:any;universe:any;game:any;stat:any;result:"win"|"loss"|"unknown"}){
  const client=db();
  const lang:Lang=universe.language==="en"?"en":"de";
  const grade=gradeGame(stat);
  const summary=lang==="en"
    ?`Overall ${grade.overall_grade}. Scoring ${grade.scoring}/100, playmaking ${grade.playmaking}/100, defense ${grade.defense}/100, efficiency ${grade.efficiency}/100, discipline ${grade.discipline}/100.`
    :`Gesamtnote ${grade.overall_grade}. Scoring ${grade.scoring}/100, Playmaking ${grade.playmaking}/100, Defense ${grade.defense}/100, Effizienz ${grade.efficiency}/100, Disziplin ${grade.discipline}/100.`;
  await client.from("postgame_grades").upsert({
    career_id:career.id,game_id:game.id,language:lang,overall_grade:grade.overall_grade,
    scoring:grade.scoring,playmaking:grade.playmaking,defense:grade.defense,efficiency:grade.efficiency,discipline:grade.discipline,summary
  },{onConflict:"career_id,game_id,language"});

  await Promise.all([
    updateReputation(career,stat,result,grade),
    updateRivalry(career,game,stat,result,lang),
    updatePersonas(career,game,stat,grade,lang),
    updateStoryArcs(career,game,stat,grade,lang),
    updateRecords(career.id,game.season_id,game,stat,lang),
    updateGoals(career,game.season_id,lang),
    createInterview(career,game,stat,lang)
  ]);
  const next=await nextGame(career,universe,game.game_day);
  if(next)await ensurePregameCoverage(career,universe,next,lang);
  return {grade,legacy:await updateLegacy(career.id)};
}

export async function answerInterview(careerId:string,interviewId:string,optionId:string){
  const client=db(),lang=await getLang(careerId);
  const {data:i}=await client.from("interviews").select("*").eq("id",interviewId).eq("career_id",careerId).eq("language",lang).single();
  if(!i||i.status!=="open")throw new Error(lang==="en"?"Interview is not open.":"Interview ist nicht mehr offen.");
  const option=(i.options||[]).find((o:any)=>o.id===optionId);
  if(!option)throw new Error(lang==="en"?"Invalid answer.":"Ungültige Antwort.");
  const {data:r}=await client.from("universe_reputation").select("*").eq("career_id",careerId).single();
  const impact=option.impact||{};
  await client.from("universe_reputation").update({
    media_hype:clamp(Number(r.media_hype||50)+Number(impact.hype||0)),
    fan_approval:clamp(Number(r.fan_approval||50)+Number(impact.fans||0)),
    expert_respect:clamp(Number(r.expert_respect||50)+Number(impact.expert||0)),
    hater_heat:clamp(Number(r.hater_heat||35)+Number(impact.hater||0)),
    updated_at:new Date().toISOString()
  }).eq("career_id",careerId);
  await client.from("interviews").update({answered_option:optionId,answer_text:option.label,impact,status:"answered"}).eq("id",interviewId);
  return option;
}

export async function createSeasonRecap(career:any,season:any,lang:Lang){
  const client=db();
  const {data:existing}=await client.from("season_recaps").select("*").eq("career_id",career.id).eq("season_id",season.id).eq("language",lang).maybeSingle();
  if(existing)return existing;
  const {data:stats}=await client.from("player_game_stats").select("*,games!inner(season_id,stage)").eq("career_id",career.id).eq("games.season_id",season.id);
  const rows=(stats||[]).filter((r:any)=>r.appearance_status==="played");
  const games=rows.length,total=(k:string)=>rows.reduce((a:any,r:any)=>a+Number(r[k]||0),0),avg=(k:string)=>games?total(k)/games:0;
  const best=[...rows].sort((a:any,b:any)=>Number(b.points)-Number(a.points))[0];
  const playoffGames=rows.filter((r:any)=>isPlayoff(r.games?.stage)).length;
  const statsJson={games,ppg:avg("points"),rpg:avg("rebounds"),apg:avg("assists"),spg:avg("steals"),bpg:avg("blocks"),playoff_games:playoffGames};
  const highlights:any[]=[];
  if(best)highlights.push({type:"best_game",points:best.points,rebounds:best.rebounds,assists:best.assists,game_id:best.game_id});
  const title=lang==="en"?`${season.label}: The season in review`:`${season.label}: Die Saison im Rückblick`;
  const summary=lang==="en"
    ?`${career.player_name} played ${games} games and averaged ${statsJson.ppg.toFixed(1)} PPG, ${statsJson.rpg.toFixed(1)} RPG and ${statsJson.apg.toFixed(1)} APG. The season included ${playoffGames} playoff appearances.`
    :`${career.player_name} absolvierte ${games} Spiele und kam auf ${statsJson.ppg.toFixed(1)} PPG, ${statsJson.rpg.toFixed(1)} RPG und ${statsJson.apg.toFixed(1)} APG. Dazu kamen ${playoffGames} Playoff-Einsätze.`;
  const legacy=await updateLegacy(career.id);
  const {data}=await client.from("season_recaps").insert({career_id:career.id,season_id:season.id,language:lang,title,summary,stats:statsJson,highlights,legacy_delta:legacy.score}).select("*").single();
  return data;
}

export async function ensureTradeSaga(career:any,offers:any[],lang:Lang){
  if(!offers?.length)return null;
  const client=db(),top=[...offers].sort((a,b)=>Number(b.interest_score)-Number(a.interest_score))[0];
  const target=top.to_team_id||top.team_id;
  const {data:team}=await client.from("teams").select("*").eq("id",target).maybeSingle();
  const {data:old}=await client.from("trade_sagas").select("*").eq("career_id",career.id).eq("status","active").eq("language",lang).maybeSingle();
  const title=lang==="en"?`${team?.city||""} trade watch intensifies`:`Trade-Gerüchte um ${team?.city||""} werden heißer`;
  const summary=lang==="en"
    ?`League sources keep linking ${career.player_name} with ${team?.city} ${team?.name}. Nothing is final yet.`
    :`Ligaweit wird ${career.player_name} weiter mit den ${team?.city} ${team?.name} in Verbindung gebracht. Noch ist nichts final.`;
  let saga=old;
  if(old){
    const heat=clamp(Number(old.heat)+8);
    await client.from("trade_sagas").update({target_team_id:target,heat,title,summary,updated_at:new Date().toISOString()}).eq("id",old.id);
    saga={...old,target_team_id:target,heat,title,summary};
  }else{
    const ins=await client.from("trade_sagas").insert({career_id:career.id,target_team_id:target,status:"active",heat:45,title,summary,started_on:career.universe_date,language:lang}).select("*").single();
    saga=ins.data;
  }
  if(saga){
    await client.from("trade_saga_updates").insert({
      saga_id:saga.id,update_date:career.universe_date,kind:"rumor",headline:title,body:summary,language:lang
    });
  }
  return saga;
}


export async function initializeSeasonGoals(career:any,seasonId:string,language?:Lang){
  const lang=language||await getLang(career.id);
  await ensureGoals(career,seasonId,lang);
  return true;
}


export async function rebuildUniverseSystems(career:any,universe:any){
  const client=db();
  const lang:Lang=universe.language==="en"?"en":"de";
  await Promise.all([
    client.from("rivalries").delete().eq("career_id",career.id),
    client.from("persona_memories").delete().eq("career_id",career.id).eq("language",lang),
    client.from("pregame_coverage").delete().eq("career_id",career.id).eq("language",lang),
    client.from("postgame_grades").delete().eq("career_id",career.id).eq("language",lang),
    client.from("season_goals").delete().eq("career_id",career.id).eq("language",lang),
    client.from("career_records").delete().eq("career_id",career.id).eq("language",lang),
    client.from("interviews").delete().eq("career_id",career.id).eq("language",lang),
    client.from("fanbase_metrics").delete().eq("career_id",career.id),
    client.from("story_arcs").delete().eq("career_id",career.id).eq("language",lang).in("category",["hype","adversity","performance"])
  ]);
  await client.from("universe_reputation").upsert({
    career_id:career.id,league_reputation:50,star_power:50,media_hype:50,fan_approval:50,
    expert_respect:50,hater_heat:35,cultural_impact:35,updated_at:new Date().toISOString()
  },{onConflict:"career_id"});
  await client.from("legacy_scores").upsert({career_id:career.id,score:0,breakdown:{},updated_at:new Date().toISOString()},{onConflict:"career_id"});

  const {data:stats,error}=await client.from("player_game_stats")
    .select("*,games(*)").eq("career_id",career.id).order("created_at");
  if(error)throw error;
  let processed=0;
  for(const stat of stats||[]){
    const game=stat.games;
    if(!game)continue;
    const {data:ug}=await client.from("universe_games").select("*")
      .eq("universe_id",universe.id).eq("game_id",game.id).maybeSingle();
    const home=Number(ug?.home_score??game.home_score??0),away=Number(ug?.away_score??game.away_score??0);
    const won=stat.team_id===game.home_team_id?home>away:away>home;
    const lost=stat.team_id===game.home_team_id?home<away:away<home;
    await updateUniverseAfterGame({
      career,universe,game:{...game,home_score:home,away_score:away},stat,
      result:won?"win":lost?"loss":"unknown"
    });
    processed++;
  }
  return {processed};
}
