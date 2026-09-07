import {NextResponse} from "next/server";
import {requireAdmin,apiStatus} from "@/lib/auth";

const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));

export async function POST(req:Request){
  try{
    const {career,universe,client}=await requireAdmin();
    const lang=universe.language==="en"?"en":"de";
    const b=await req.json();
    const choice=String(b.choice||"");
    const {data:saga}=await client.from("trade_sagas").select("*,team:target_team_id(*)")
      .eq("id",String(b.sagaId||"")).eq("career_id",career.id).eq("language",lang).single();
    if(!saga)return NextResponse.json({error:lang==="en"?"Trade saga not found.":"Trade-Saga nicht gefunden."},{status:404});

    const configs:any={
      demand:{
        heat:18,hype:8,fans:-3,expert:-2,hater:8,status:"active",
        de:"Ich will einen Trade. Die Situation muss sich ändern.",
        en:"I want a trade. The situation has to change."
      },
      silent:{
        heat:4,hype:2,fans:0,expert:1,hater:2,status:"active",
        de:"Kein Kommentar zu den Gerüchten.",
        en:"No comment on the rumors."
      },
      deny:{
        heat:-10,hype:-3,fans:4,expert:2,hater:-1,status:"active",
        de:"Die Gerüchte stimmen so nicht. Mein Fokus liegt auf Basketball.",
        en:"The rumors are not accurate. My focus is basketball."
      },
      happy:{
        heat:-16,hype:-4,fans:7,expert:3,hater:-2,status:"resolved",
        de:"Ich bin hier glücklich und will mit diesem Team gewinnen.",
        en:"I'm happy here and I want to win with this team."
      }
    };
    const cfg=configs[choice];
    if(!cfg)return NextResponse.json({error:lang==="en"?"Invalid response.":"Ungültige Reaktion."},{status:400});

    const heat=clamp(Number(saga.heat||40)+cfg.heat);
    const text=lang==="en"?cfg.en:cfg.de;
    await client.from("trade_sagas").update({
      heat,status:cfg.status,summary:text,metadata:{...(saga.metadata||{}),last_player_response:choice},
      updated_at:new Date().toISOString()
    }).eq("id",saga.id);

    await client.from("trade_saga_updates").insert({
      saga_id:saga.id,update_date:career.universe_date,kind:"player_response",
      headline:lang==="en"?"Player responds to trade rumors":"Spieler reagiert auf Trade-Gerüchte",
      body:text,language:lang
    });

    const {data:rep}=await client.from("universe_reputation").select("*").eq("career_id",career.id).single();
    if(rep){
      await client.from("universe_reputation").update({
        media_hype:clamp(Number(rep.media_hype)+cfg.hype),
        fan_approval:clamp(Number(rep.fan_approval)+cfg.fans),
        expert_respect:clamp(Number(rep.expert_respect)+cfg.expert),
        hater_heat:clamp(Number(rep.hater_heat)+cfg.hater),
        updated_at:new Date().toISOString()
      }).eq("career_id",career.id);
    }

    await client.from("media_posts").insert({
      career_id:career.id,game_id:null,outlet:"League Desk",kind:"rumor",author_name:"R. Fields",
      tone:choice==="demand"?"breaking":"measured",
      headline:lang==="en"?"Trade saga: player addresses the noise":"Trade-Saga: Spieler äußert sich zu den Gerüchten",
      body:text,virality:choice==="demand"?94:68,generation_source:"player_choice",language:lang
    });

    return NextResponse.json({ok:true,heat,status:cfg.status});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:String(e)},{status:apiStatus(e)});
  }
}
