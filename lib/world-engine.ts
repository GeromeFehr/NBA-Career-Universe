import {db} from "@/lib/db";

type Lang="de"|"en";
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(n)));
const pct=(m:number,a:number)=>a>0?m/a:0;
const isPlayoff=(stage:any)=>/playoff|play-in|conference|final/i.test(String(stage||""));
const letter=(n:number)=>n>=97?"A+":n>=93?"A":n>=90?"A-":n>=87?"B+":n>=83?"B":n>=80?"B-":n>=77?"C+":n>=73?"C":n>=70?"C-":n>=67?"D+":n>=63?"D":n>=60?"D-":"F";

function stableHash(value:string){
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}

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
      last5:last5.reduce((m:number,r:any)=>m+Number(r.fgm||0),0)/Math.max(1,last5.reduce((m:number,r:any)=>m+Number(r.fga||0),0)),
      last10:last10.reduce((m:number,r:any)=>m+Number(r.fgm||0),0)/Math.max(1,last10.reduce((m:number,r:any)=>m+Number(r.fga||0),0))
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

async function rebuildCareerRecords(careerId:string,lang:Lang){
  const client=db();
  const {data:rows,error}=await client.from("player_game_stats")
    .select("*,games(season_id,stage)")
    .eq("career_id",careerId)
    .eq("appearance_status","played");
  if(error)throw error;

  const stats=rows||[];
  const categories:any[]=[
    ["points",lang==="en"?"Points":"Punkte"],
    ["rebounds",lang==="en"?"Rebounds":"Rebounds"],
    ["assists",lang==="en"?"Assists":"Assists"],
    ["steals",lang==="en"?"Steals":"Steals"],
    ["blocks",lang==="en"?"Blocks":"Blocks"],
    ["tpm",lang==="en"?"Three-pointers made":"Getroffene Dreier"]
  ];

  await client.from("career_records").delete().eq("career_id",careerId).eq("language",lang);

  const insertBest=async(scope:"career"|"season"|"playoffs",group:any[],seasonId:string|null)=>{
    if(!group.length)return;
    for(const [field,label] of categories){
      const best=[...group].sort((a:any,b:any)=>Number(b[field]||0)-Number(a[field]||0))[0];
      if(!best)continue;
      await client.from("career_records").insert({
        career_id:careerId,
        season_id:scope==="career"?null:seasonId,
        scope,
        category:field==="tpm"?"threes":field,
        value:Number(best[field]||0),
        game_id:best.game_id,
        label,
        language:lang,
        updated_at:new Date().toISOString()
      });
    }
  };

  await insertBest("career",stats,null);

  const seasonIds=[...new Set(stats.map((r:any)=>r.games?.season_id).filter(Boolean))] as string[];
  for(const seasonId of seasonIds){
    const seasonRows=stats.filter((r:any)=>r.games?.season_id===seasonId);
    await insertBest("season",seasonRows,seasonId);
    const playoffRows=seasonRows.filter((r:any)=>isPlayoff(r.games?.stage));
    await insertBest("playoffs",playoffRows,seasonId);
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

async function updateOrganicTradeInterest(career:any,game:any,lang:Lang){
  const client=db();
  const [{data:played},{data:rep},{data:teams},{data:pending}]=await Promise.all([
    client.from("player_game_stats").select("id").eq("career_id",career.id).eq("appearance_status","played"),
    client.from("universe_reputation").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("teams").select("*").eq("active",true),
    client.from("trade_offers").select("id").eq("career_id",career.id).eq("language",lang).eq("status","pending")
  ]);
  const games=(played||[]).length;
  if(games<2)return {games,interest:[]};

  const eligible=(teams||[]).filter((t:any)=>t.id!==career.current_team_id);
  const base=clamp(
    Number(career.overall||75)*.42+
    Number(rep?.star_power||50)*.28+
    Number(rep?.media_hype||50)*.20+
    Math.min(10,games*2.2)
  );
  const count=games>=8?5:games>=4?4:3;
  const picked=[...eligible]
    .sort((a:any,b:any)=>stableHash(career.id+a.abbreviation)-stableHash(career.id+b.abbreviation))
    .slice(0,count);

  const interests:any[]=[];
  for(let i=0;i<picked.length;i++){
    const team=picked[i];
    const jitter=(stableHash(game.id+team.abbreviation)%7)-3;
    const score=clamp(base-i*5+jitter);
    const rationale=lang==="en"
      ?`${team.city} is quietly monitoring the situation after ${games} career games. The combination of star power, production and long-term upside is drawing attention.`
      :`${team.city} beobachtet die Situation nach ${games} Karrierespielen zunehmend. Die Mischung aus Star-Power, Produktion und langfristigem Upside sorgt ligaweit für Interesse.`;

    await client.from("trade_interest").upsert({
      career_id:career.id,team_id:team.id,interest_score:score,rationale,status:"active",language:lang,updated_at:new Date().toISOString()
    },{onConflict:"career_id,team_id,language"});
    interests.push({team_id:team.id,interest_score:score,rationale,team});
  }

  const top=[...interests].sort((a,b)=>b.interest_score-a.interest_score)[0];
  if(top&&top.interest_score>=78&&games>=3){
    await ensureTradeSaga(career,[top],lang);
  }

  if(top&&games>=5&&top.interest_score>=84&&!(pending||[]).length){
    const premium=Number(career.overall||0)>=95;
    const packageSummary=lang==="en"
      ?(premium
        ?"Young starter + 4 first-round picks + 2 pick swaps"
        :"Young starter + multiple first-round picks + pick swap")
      :(premium
        ?"Junger Starter + 4 First-Round-Picks + 2 Pick-Swaps"
        :"Junger Starter + mehrere First-Round-Picks + Pick-Swap");
    await client.from("trade_offers").insert({
      career_id:career.id,from_team_id:career.current_team_id,to_team_id:top.team_id,
      interest_score:top.interest_score,fairness_score:clamp(top.interest_score+4),
      package_summary:packageSummary,rationale:top.rationale,pressure:"high",
      status:"pending",generated_by:"organic",language:lang
    });
  }

  return {games,interest:interests};
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

async function createInterview(career:any,game:any,stat:any,grade:any,result:"win"|"loss"|"unknown",lang:Lang){
  const client=db();
  const {data:existing}=await client.from("interviews").select("id,topic").eq("career_id",career.id).eq("game_id",game.id).eq("language",lang);
  if((existing||[]).length)return;

  const opponentId=game.home_team_id===stat.team_id?game.away_team_id:game.home_team_id;
  const [{data:opponent},{data:recentInterviews},{data:rep},{data:previous},{data:rivalry},{data:tradeSaga}]=await Promise.all([
    client.from("teams").select("*").eq("id",opponentId).maybeSingle(),
    client.from("interviews").select("topic,question").eq("career_id",career.id).eq("language",lang).order("created_at",{ascending:false}).limit(8),
    client.from("universe_reputation").select("*").eq("career_id",career.id).maybeSingle(),
    client.from("player_game_stats").select("*").eq("career_id",career.id).neq("game_id",game.id).eq("appearance_status","played").order("created_at",{ascending:false}).limit(20),
    client.from("rivalries").select("*").eq("career_id",career.id).eq("opponent_team_id",opponentId).maybeSingle(),
    client.from("trade_sagas").select("*,team:target_team_id(*)").eq("career_id",career.id).eq("language",lang).eq("status","active").order("heat",{ascending:false}).limit(1).maybeSingle()
  ]);

  const en=lang==="en";
  const scoreFor=(teamId:string)=>teamId===game.home_team_id?Number(game.home_score||0):Number(game.away_score||0);
  const myScore=scoreFor(stat.team_id);
  const oppScore=stat.team_id===game.home_team_id?Number(game.away_score||0):Number(game.home_score||0);
  const margin=Math.abs(myScore-oppScore);
  const fg=pct(Number(stat.fgm||0),Number(stat.fga||0));
  const tripleCats=[stat.points,stat.rebounds,stat.assists,stat.steals,stat.blocks].filter((x:any)=>Number(x)>=10).length;
  const prev=previous||[];
  const prevMax=(k:string)=>prev.reduce((m:number,r:any)=>Math.max(m,Number(r[k]||0)),0);
  const gameNo=prev.length+1;
  const recentTopics=new Set((recentInterviews||[]).map((x:any)=>String(x.topic||"")));
  const teamName=opponent?opponent.city+" "+opponent.name:(en?"the opponent":"den Gegner");

  const style=(de:string,enText:string)=>en?enText:de;
  const opts=(topic:string)=>{
    const common:any={
      hype:[
        {id:"confident",style:style("Selbstbewusst","Confident"),label:style("Wenn sie reden wollen, sollen sie reden. Ich weiß, was ich kann.","If they want to talk, let them talk. I know what I can do."),impact:{hype:5,star:3,hater:5}},
        {id:"team",style:"Team-first",label:style("Der Hype ist egal. Entscheidend ist, dass wir gewinnen.","The hype does not matter. What matters is that we win."),impact:{fans:5,expert:3,hype:-2}},
        {id:"grounded",style:style("Geerdet","Grounded"),label:style("Es waren gute Minuten, aber ich habe noch nichts erreicht.","It was a good night, but I have not accomplished anything yet."),impact:{expert:5,hype:-2,hater:-2}},
        {id:"spicy",style:style("Provokant","Spicy"),label:style("Vielleicht müssen sich die Leute langsam daran gewöhnen.","Maybe people should start getting used to it."),impact:{hype:7,star:4,hater:8,culture:3}}
      ],
      defense:[
        {id:"anchor",style:style("Ansage","Statement"),label:style("Wenn ich am Ring bin, sollen sie zweimal überlegen.","If I am at the rim, they should think twice."),impact:{hype:4,star:3,hater:3}},
        {id:"scheme",style:style("Analytisch","Analytical"),label:style("Das war Team-Defense. Ich war nur derjenige, der einige Plays beendet hat.","That was team defense. I was just the guy finishing some of the plays."),impact:{expert:6,fans:3}},
        {id:"better",style:style("Selbstkritisch","Self-critical"),label:style("Die Blocks sehen gut aus, aber bei den Rotationen können wir noch sauberer sein.","The blocks look good, but our rotations can still be cleaner."),impact:{expert:7,hype:-1}},
        {id:"challenge",style:style("Kampfansage","Challenge"),label:style("Ich hoffe, die nächsten Teams greifen den Ring trotzdem an.","I hope the next teams still attack the rim."),impact:{hype:6,hater:5,culture:3}}
      ],
      adversity:[
        {id:"accountable",style:style("Verantwortung","Accountability"),label:style("Ich muss besser sein. So einfach ist das.","I have to be better. It is that simple."),impact:{expert:6,fans:3,hype:-2}},
        {id:"next",style:style("Fokus","Focus"),label:style("Das Spiel ist vorbei. Morgen geht es um die Reaktion.","The game is over. Tomorrow is about the response."),impact:{fans:3,expert:3}},
        {id:"context",style:style("Einordnung","Context"),label:style("Nicht alles war schlecht, aber wir haben die entscheidenden Dinge nicht gut genug gemacht.","Not everything was bad, but we did not execute the important things well enough."),impact:{expert:4}},
        {id:"edge",style:style("Genervt","Defiant"),label:style("Eine schlechte Nacht ändert nicht, was ich für ein Spieler bin.","One bad night does not change what kind of player I am."),impact:{hype:2,star:2,hater:4}}
      ],
      efficiency:[
        {id:"reads",style:style("Analytisch","Analytical"),label:style("Ich habe genommen, was die Defense mir gegeben hat.","I took what the defense gave me."),impact:{expert:6}},
        {id:"attack",style:style("Aggressiv","Aggressive"),label:style("Wenn ich solche Looks bekomme, werde ich weiter angreifen.","If I get those looks, I am going to keep attacking."),impact:{hype:3,star:2}},
        {id:"team",style:"Team-first",label:style("Gute Würfe entstehen aus guter Offense. Das war nicht nur ich.","Good shots come from good offense. That was not just me."),impact:{fans:5,expert:3}},
        {id:"ceiling",style:style("Selbstbewusst","Confident"),label:style("Ich glaube nicht, dass das schon mein bestes Basketball war.","I do not think that was my best basketball yet."),impact:{hype:5,star:4,hater:4}}
      ],
      pressure:[
        {id:"calm",style:style("Gelassen","Calm"),label:style("Druck gehört dazu. Genau dafür spiele ich.","Pressure is part of it. That is exactly why I play."),impact:{star:4,expert:3}},
        {id:"team",style:"Team-first",label:style("In engen Spielen vertraue ich meinen Jungs und sie vertrauen mir.","In close games I trust my guys and they trust me."),impact:{fans:6}},
        {id:"want_ball",style:style("Clutch","Clutch"),label:style("In solchen Momenten will ich den Ball.","In those moments, I want the ball."),impact:{hype:6,star:5,hater:4}},
        {id:"learn",style:style("Lernend","Learning"),label:style("Genau solche Possessions helfen mir am meisten, besser zu werden.","Those are the possessions that help me improve the most."),impact:{expert:5}}
      ],
      criticism:[
        {id:"own",style:style("Verantwortung","Accountability"),label:style("Die Turnover gehen auf mich. Ich muss die Reads früher sehen.","The turnovers are on me. I have to see the reads earlier."),impact:{expert:7,hater:-2}},
        {id:"aggressive",style:style("Aggressiv","Aggressive"),label:style("Ich werde nicht aufhören, Druck auf die Defense auszuüben.","I am not going to stop putting pressure on the defense."),impact:{hype:4,hater:4}},
        {id:"film",style:style("Film Room","Film Room"),label:style("Ich werde mir jeden einzelnen davon auf Tape ansehen.","I am going to watch every single one of them on film."),impact:{expert:6}},
        {id:"dismiss",style:style("Abweisend","Dismissive"),label:style("Wenn das heute das größte Problem war, kann ich damit leben.","If that was the biggest problem tonight, I can live with it."),impact:{hype:3,hater:7,expert:-2}}
      ],
      discipline:[
        {id:"accountable",style:style("Verantwortung","Accountability"),label:style("Ich darf mich da nicht provozieren lassen. Das geht auf mich.","I cannot let myself get baited into that. That is on me."),impact:{expert:6,hater:-2}},
        {id:"emotion",style:style("Emotional","Emotional"),label:style("Ich spiele mit Emotionen. Manchmal geht man dabei über die Linie.","I play with emotion. Sometimes you cross the line."),impact:{hype:3,culture:3,hater:3}},
        {id:"no_regret",style:style("Keine Reue","No regret"),label:style("Ich würde die Intensität nicht ändern. Nur die Reaktion muss smarter sein.","I would not change the intensity. I just have to react smarter."),impact:{star:3,expert:3}},
        {id:"silent",style:style("Kurz angebunden","No comment"),label:style("Dazu sage ich nichts.","I have nothing to say about that."),impact:{hype:2,hater:4}}
      ],
      rivalry:[
        {id:"respect",style:style("Respekt","Respect"),label:style("Gegen die macht es Spaß. Das sind genau die Spiele, die man will.","They are fun to play against. Those are exactly the games you want."),impact:{fans:4,expert:3}},
        {id:"fuel",style:style("Feuer","Fuel"),label:style("Wenn da eine Rivalry entsteht, bin ich damit völlig fein.","If a rivalry is forming, I am completely fine with that."),impact:{hype:5,culture:4,hater:3}},
        {id:"deny",style:style("Abkühlen","Downplay"),label:style("Für mich ist das einfach das nächste Spiel auf dem Plan.","To me it is just the next game on the schedule."),impact:{hype:-3,expert:2}},
        {id:"spicy",style:style("Provokant","Spicy"),label:style("Sie wissen inzwischen, was sie erwartet, wenn sie gegen uns spielen.","They know by now what is waiting for them when they play us."),impact:{hype:6,hater:7,culture:4}}
      ],
      trade:[
        {id:"stay",style:style("Loyal","Loyal"),label:style("Ich bin hier. Mein Fokus liegt komplett auf diesem Team.","I am here. My focus is completely on this team."),impact:{fans:7,hype:-2}},
        {id:"business",style:style("Sachlich","Businesslike"),label:style("Das ist ein Business. Ich kontrolliere nur, wie ich spiele.","It is a business. I only control how I play."),impact:{expert:4,hype:2}},
        {id:"open",style:style("Offen","Open"),label:style("Ich höre mir alles an, aber heute geht es um Basketball.","I listen to everything, but tonight is about basketball."),impact:{hype:5,hater:3}},
        {id:"no_comment",style:style("Kein Kommentar","No comment"),label:style("Über Gerüchte spreche ich nicht.","I do not talk about rumors."),impact:{hype:2}}
      ],
      generic:[
        {id:"team",style:"Team-first",label:style("Am wichtigsten ist der Sieg. Alles andere kommt danach.","The win matters most. Everything else comes after that."),impact:{fans:5,expert:2}},
        {id:"film",style:style("Analytisch","Analytical"),label:style("Es gab gute Dinge und Dinge, die wir morgen auf Film korrigieren.","There were good things and things we will correct on film tomorrow."),impact:{expert:5}},
        {id:"confident",style:style("Selbstbewusst","Confident"),label:style("Ich habe mich gut gefühlt und will darauf aufbauen.","I felt good and I want to build on it."),impact:{hype:3,star:2}},
        {id:"next",style:style("Fokus","Focus"),label:style("Ein Spiel. Jetzt kommt das nächste.","One game. Now it is on to the next one."),impact:{fans:2}}
      ]
    };
    return common[topic]||common.generic;
  };

  const reporters:any={
    big:[
      ["Mara Cole","National Hoops Network"],
      ["Jon Mercer","The Hardwood Wire"],
      ["Renee Ward","Postgame Desk"]
    ],
    technical:[
      ["Tess Morgan","Film Room Weekly"],
      ["Eli Carter","The Breakdown"],
      ["Nia Brooks","Court Vision"]
    ],
    skeptical:[
      ["Darren Cole","Prime Time Debate"],
      ["Marcus Reed","League Central"],
      ["Jade Foster","Full Court Tonight"]
    ],
    local:[
      ["Avery Lin","Bay Beat"],
      ["Cam Jordan","Locker Room Wire"],
      ["Sophie Grant","Warriors Daily"]
    ],
    rumor:[
      ["R. Fields","Trade Signal"],
      ["Lena Park","League Sources"],
      ["Miles Grant","Front Office Watch"]
    ]
  };
  const reporter=(pool:string,seed:string)=>{
    const arr=reporters[pool]||reporters.big;
    return arr[stableHash(seed)%arr.length];
  };

  const candidates:any[]=[];
  const add=(topic:string,importance:number,pool:string,tone:string,questionDe:string,questionEn:string,contextDe:string,contextEn:string)=>{
    const [reporter_name,outlet]=reporter(pool,game.id+topic);
    candidates.push({
      topic,importance,reporter_name,outlet,tone,
      question:style(questionDe,questionEn),context:style(contextDe,contextEn),
      options:opts(topic)
    });
  };

  if(Number(stat.points)>=45)add("hype",98,"big","spotlight",
    `${stat.points} Punkte – ist das inzwischen der Standard, den du selbst von dir erwartest?`,
    `${stat.points} points — is this becoming the standard you expect from yourself?`,
    `${stat.points} PTS · ${stat.rebounds} REB · ${stat.assists} AST`,
    `${stat.points} PTS · ${stat.rebounds} REB · ${stat.assists} AST`);

  if(Number(stat.blocks)>=7||Number(stat.steals)>=5)add("defense",96,"technical","technical",
    `${stat.blocks} Blocks und ${stat.steals} Steals: Wie viel davon ist Instinkt und wie viel Vorbereitung?`,
    `${stat.blocks} blocks and ${stat.steals} steals: how much is instinct and how much is preparation?`,
    "Defensiver Einfluss war einer der größten Faktoren des Spiels.",
    "Defensive impact was one of the defining factors of the game.");

  if(tripleCats>=3)add("hype",94,"big","historic",
    "Du hast in mindestens drei Kategorien zweistellig aufgelegt. Was sagt dir so eine Allround-Leistung über dein Spiel?",
    "You reached double figures in at least three categories. What does an all-around night like that tell you about your game?",
    "Triple-Double-Level an Gesamtproduktion.",
    "Triple-double-level all-around production.");

  if(result==="loss")add("adversity",93,"local","accountability",
    `Was ärgert dich nach der Niederlage gegen ${teamName} am meisten?`,
    `What bothers you most after the loss to ${teamName}?`,
    `Endstand ${myScore}:${oppScore} aus deiner Sicht.`,
    `Final score ${myScore}-${oppScore} from your side.`);

  if(margin<=5)add("pressure",92,"big","clutch",
    `Das Spiel war bis zum Ende eng. Was verändert sich für dich mental in den letzten zwei Minuten?`,
    `The game stayed tight until the end. What changes mentally for you in the final two minutes?`,
    `Entscheidung mit nur ${margin} Punkt(en) Unterschied.`,
    `Decided by only ${margin} point(s).`);

  if(Number(stat.turnovers)>=5)add("criticism",90,"skeptical","critical",
    `${stat.turnovers} Turnover heute: Wo waren die Reads zu spät oder zu riskant?`,
    `${stat.turnovers} turnovers tonight: where were the reads late or too risky?`,
    "Die Produktion war hoch, aber auch die Fehlerzahl fiel auf.",
    "The production was high, but so was the mistake count.");

  if(Number(stat.technical_fouls)>0||Number(stat.flagrant_fouls)>0||stat.ejected)add("discipline",95,"skeptical","controversy",
    "Wie erklärst du die Szene, die zur technischen beziehungsweise Flagrant-Strafe geführt hat?",
    "How do you explain the sequence that led to the technical or flagrant foul?",
    `${stat.technical_fouls||0} Tech · ${stat.flagrant_fouls||0} Flagrant${stat.ejected?" · Ejection":""}`,
    `${stat.technical_fouls||0} tech · ${stat.flagrant_fouls||0} flagrant${stat.ejected?" · ejection":""}`);

  if(Number(stat.fga)>=12&&fg>=.60)add("efficiency",89,"technical","technical",
    `${Math.round(fg*100)} Prozent aus dem Feld – hast du heute besonders früh erkannt, was die Defense dir geben würde?`,
    `${Math.round(fg*100)} percent from the field — did you recognize early what the defense was going to give you?`,
    `${stat.fgm}/${stat.fga} aus dem Feld.`,
    `${stat.fgm}/${stat.fga} from the field.`);

  if(Number(stat.fga)>=24&&fg<.45)add("criticism",88,"skeptical","skeptical",
    `${stat.fga} Würfe bei ${Math.round(fg*100)} Prozent: Warst du heute zu sehr im Forcieren-Modus?`,
    `${stat.fga} shots at ${Math.round(fg*100)} percent: were you forcing the issue too much tonight?`,
    "Hohe Usage bei schwieriger Effizienz.",
    "High usage on difficult efficiency.");

  if(prev.length&&Number(stat.points)>prevMax("points"))add("hype",91,"big","record",
    `Neuer Career High mit ${stat.points} Punkten – bedeutet dir so ein persönlicher Rekord schon etwas?`,
    `New career high with ${stat.points} points — does a personal record like that mean much to you already?`,
    "Neuer persönlicher Bestwert.",
    "New personal best.");

  if(Number(rivalry?.heat||0)>=55)add("rivalry",90,"local","rivalry",
    `Die Spiele gegen ${teamName} werden spürbar giftiger. Nennst du das inzwischen eine Rivalry?`,
    `The games against ${teamName} are getting noticeably more heated. Do you call this a rivalry now?`,
    `Rivalry Heat ${rivalry?.heat||0}/100.`,
    `Rivalry heat ${rivalry?.heat||0}/100.`);

  if(tradeSaga&&Number(tradeSaga.heat||0)>=55)add("trade",87,"rumor","rumor",
    `Die Gerüchte um ${tradeSaga.team?.city||"einen möglichen Trade"} werden lauter. Belastet dich das inzwischen?`,
    `The rumors around ${tradeSaga.team?.city||"a possible trade"} are getting louder. Is it becoming a distraction?`,
    `Trade-Saga Heat ${tradeSaga.heat||0}/100.`,
    `Trade saga heat ${tradeSaga.heat||0}/100.`);

  if(gameNo<=5)add("hype",84,"big","rookie",
    `Du bist erst bei NBA-Spiel Nummer ${gameNo}. Wie schnell fühlt sich das alles für dich gerade an?`,
    `This is only NBA game number ${gameNo}. How fast does all of this feel right now?`,
    "Frühe Phase der Rookie-Saison.",
    "Early stage of the rookie season.");

  if(margin>=20&&result==="win")add("generic",81,"local","team",
    `Ein deutlicher Sieg gegen ${teamName}: Was hat euch heute so früh Kontrolle über das Spiel gegeben?`,
    `A comfortable win over ${teamName}: what allowed you to take control so early?`,
    `Sieg mit ${margin} Punkten Unterschied.`,
    `Won by ${margin} points.`);

  if(Number(stat.minutes)<=25&&Number(stat.points)>=25)add("efficiency",86,"technical","minutes",
    `${stat.points} Punkte in nur ${stat.minutes} Minuten – fällt es dir schwer, bei so einem Rhythmus vom Feld zu gehen?`,
    `${stat.points} points in only ${stat.minutes} minutes — is it hard to leave the floor when you are in that kind of rhythm?`,
    "Außergewöhnliche Produktion in begrenzten Minuten.",
    "Exceptional production in limited minutes.");

  if(Number(rep?.hater_heat||0)>=70)add("hype",83,"skeptical","media",
    "Je größer deine Zahlen werden, desto lauter wird auch die Kritik. Hörst du diese Stimmen überhaupt?",
    "The bigger your numbers get, the louder the criticism becomes too. Do you hear those voices at all?",
    `Hater Heat ${rep?.hater_heat||0}/100.`,
    `Hater heat ${rep?.hater_heat||0}/100.`);

  if(!candidates.length)add("generic",70,"local","balanced",
    "Was nimmst du aus der heutigen Leistung mit – und was willst du im nächsten Spiel anders machen?",
    "What do you take from tonight's performance, and what do you want to do differently next game?",
    `${stat.points} PTS · ${stat.rebounds} REB · ${stat.assists} AST · ${result}`,
    `${stat.points} PTS · ${stat.rebounds} REB · ${stat.assists} AST · ${result}`);

  const fresh=candidates.filter(x=>!recentTopics.has(x.topic));
  const pool=fresh.length?fresh:candidates;
  pool.sort((a,b)=>b.importance-a.importance||(stableHash(game.id+a.topic)-stableHash(game.id+b.topic)));

  const eventful=pool.filter(x=>x.importance>=90).length>=2;
  const selected=[pool[0]];
  if(eventful){
    const second=pool.find(x=>x.topic!==pool[0].topic&&x.reporter_name!==pool[0].reporter_name);
    if(second)selected.push(second);
  }

  const rows=selected.map((x:any)=>({
    career_id:career.id,game_id:game.id,interview_date:game.game_day,
    question:x.question,options:x.options,language:lang,status:"open",
    reporter_name:x.reporter_name,outlet:x.outlet,topic:x.topic,tone:x.tone,
    context:x.context,importance:x.importance
  }));
  const {error}=await client.from("interviews").insert(rows);
  if(error)throw error;
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

  await updateReputation(career,stat,result,grade);
  await Promise.all([
    updateRivalry(career,game,stat,result,lang),
    updatePersonas(career,game,stat,grade,lang),
    updateStoryArcs(career,game,stat,grade,lang),
    updateRecords(career.id,game.season_id,game,stat,lang),
    updateGoals(career,game.season_id,lang),
    createInterview(career,game,stat,grade,result,lang),
    updateOrganicTradeInterest(career,game,lang)
  ]);
  const next=await nextGame(career,universe,game.game_day);
  if(next)await ensurePregameCoverage(career,universe,next,lang);
  return {grade,legacy:await updateLegacy(career.id)};
}

export async function refreshDerivedAfterStatEdit({career,universe,game,stat}:{career:any;universe:any;game:any;stat:any}){
  const client=db();
  const lang:Lang=universe.language==="en"?"en":"de";
  const grade=gradeGame(stat);
  const summary=lang==="en"
    ?`Overall ${grade.overall_grade}. Scoring ${grade.scoring}/100, playmaking ${grade.playmaking}/100, defense ${grade.defense}/100, efficiency ${grade.efficiency}/100, discipline ${grade.discipline}/100.`
    :`Gesamtnote ${grade.overall_grade}. Scoring ${grade.scoring}/100, Playmaking ${grade.playmaking}/100, Defense ${grade.defense}/100, Effizienz ${grade.efficiency}/100, Disziplin ${grade.discipline}/100.`;

  // Only deterministic derivatives are corrected. Narrative state, reputation,
  // rivalries, interviews, trade market and media are deliberately untouched.
  await client.from("postgame_grades").upsert({
    career_id:career.id,game_id:game.id,language:lang,overall_grade:grade.overall_grade,
    scoring:grade.scoring,playmaking:grade.playmaking,defense:grade.defense,
    efficiency:grade.efficiency,discipline:grade.discipline,summary
  },{onConflict:"career_id,game_id,language"});

  await Promise.all([
    updateGoals(career,game.season_id,lang),
    rebuildCareerRecords(career.id,lang)
  ]);

  return {grade,legacy:await updateLegacy(career.id),mode:"edit"};
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
    star_power:clamp(Number(r.star_power||50)+Number(impact.star||0)),
    cultural_impact:clamp(Number(r.cultural_impact||35)+Number(impact.culture||0)),
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


export async function refreshLegacyScore(careerId:string){
  return updateLegacy(careerId);
}
