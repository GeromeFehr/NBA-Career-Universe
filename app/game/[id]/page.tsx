import {basketballTerms} from "@/lib/basketball-terms";
import {coopResultForGame} from "@/lib/coop-data";
import Link from "next/link";
import {notFound} from "next/navigation";
import {pageContext} from "@/lib/universe";
import {langOf} from "@/lib/i18n";
import {label,prose} from "@/lib/labels";
import {ensurePregameCoverage} from "@/lib/world-engine";
import {PageHeader,Section,MetricStrip,Meter,EmptyState} from "@/components/Editorial";
import Scoreboard from "@/components/Scoreboard";
import PregameBrief from "@/components/PregameBrief";
import QuickGameEntry from "@/components/QuickGameEntry";
import MediaCard from "@/components/MediaCard";
import GenerateMediaButton from "@/components/GenerateMediaButton";
export const dynamic="force-dynamic";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const {client,career,universe}=await pageContext(),lang=langOf(universe),en=lang==="en";
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();const {data:g,error}=await client.from("games").select("*,home:teams!games_home_team_id_fkey(*),away:teams!games_away_team_id_fkey(*)").eq("id",id).or(`universe_id.is.null,universe_id.eq.${universe.id}`).maybeSingle();if(error)throw error;if(!g)notFound();
 const [{data:result},{data:s},{data:notables},{data:media},{data:stint},{data:grade},{data:stored},{data:settings}]=await Promise.all([
 client.from("universe_games").select("*").eq("universe_id",universe.id).eq("game_id",id).maybeSingle(),client.from("player_game_stats").select("*,team:teams(*)").eq("career_id",career.id).eq("game_id",id).maybeSingle(),client.from("game_notables").select("*").eq("career_id",career.id).eq("game_id",id),client.from("media_posts").select("*").eq("career_id",career.id).eq("game_id",id).eq("language",lang).order("created_at",{ascending:false}),client.from("team_stints").select("team_id").eq("career_id",career.id).lte("start_date",g.game_day).or(`end_date.is.null,end_date.gte.${g.game_day}`).order("start_date",{ascending:false}).order("created_at",{ascending:false}).limit(1).maybeSingle(),client.from("postgame_grades").select("*").eq("career_id",career.id).eq("game_id",id).eq("language",lang).maybeSingle(),client.from("pregame_coverage").select("*").eq("career_id",career.id).eq("game_id",id).eq("language",lang).maybeSingle(),client.from("world_settings").select("auto_media").eq("career_id",career.id).maybeSingle()
 ]);
 const teamId=s?.team_id||stint?.team_id||career.current_team_id,canEnter=teamId===g.home_team_id||teamId===g.away_team_id,game={...g,status:result?.status||"scheduled",home_score:result?.home_score??null,away_score:result?.away_score??null};
 const sharedResult=canEnter?await coopResultForGame(client,universe.id,g):null;
 const pregame=stored||(canEnter&&game.status!=="completed"?await ensurePregameCoverage(career,universe,g,lang):null);const winner=game.status==="completed"?(Number(game.home_score)>Number(game.away_score)?g.home?.abbreviation:g.away?.abbreviation):null;
 return <><PageHeader title={`${g.away?.abbreviation} @ ${g.home?.abbreviation}`} subtitle={g.venue||undefined} actions={canEnter?<a className="textLink" href="#stats">{s?(en?"Correct entry":"Eintrag korrigieren"):(en?"Enter game":"Spiel eintragen")} ↓</a>:undefined}/><Scoreboard game={game} language={lang}/>
 {s&&<Section title={`${career.player_name} · ${s.team?.abbreviation}`}><div className="appearanceLine"><strong>{label(s.appearance_status,lang)}</strong>{s.started&&<span>Starter</span>}{s.fouled_out&&<span>{en?"Fouled out":"Ausgefoult"}</span>}{s.ejected&&<span>{en?"Ejected":"Platzverweis"}</span>}{s.injured&&<span>{en?"Injured":"Verletzt"}</span>}</div>{s.appearance_status==="played"&&<MetricStrip items={[["MIN",s.minutes],["PTS",s.points],["REB",s.rebounds],["AST",s.assists],["STL",s.steals],["BLK",s.blocks],["TO",s.turnovers],["PF",s.fouls],["FG",`${s.fgm}/${s.fga}`],["3PT",`${s.tpm}/${s.tpa}`],["FT",`${s.ftm}/${s.fta}`],["+/-",s.plus_minus]].map(([key,value])=>({label:String(key),value}))}/>} {prose(s,"story_notes",lang)&&<p className="gameNotes">{prose(s,"story_notes",lang)}</p>}{prose(s,"injury_note",lang)&&<p className="injuryNote"><b>{en?"Medical note":"Verletzungsnotiz"}:</b> {prose(s,"injury_note",lang)}</p>}</Section>}
 {grade&&s?.appearance_status==="played"&&<Section title={en?"The performance report":"Der Leistungsbericht"}><div className="gradePanel"><div className="gradeHero"><strong>{grade.overall_grade}</strong><p>{basketballTerms(grade.summary)}</p></div><div className="gradeBars">{[["Scoring",grade.scoring],["Playmaking",grade.playmaking],["Defense",grade.defense],["Efficiency",grade.efficiency],[en?"Discipline":"Disziplin",grade.discipline]].map(([text,value])=><Meter key={String(text)} label={String(text)} value={Number(value)}/>)}</div></div></Section>}
 {sharedResult&&<p className="coopNotice">{en?"Your partner has recorded this result":"Dein Mitspieler hat diesen Endstand eingetragen"}: {g.away?.abbreviation} {sharedResult.away_score} : {sharedResult.home_score} {g.home?.abbreviation}. <Link href="/coop#matchups">{en?"Open shared games":"Zu den gemeinsamen Spielen"} →</Link></p>}
 <PregameBrief coverage={pregame} language={lang} winner={winner}/>{canEnter?<QuickGameEntry game={g} existingStat={s} existingResult={result||sharedResult} existingNotables={notables||[]} language={lang} autoMedia={settings?.auto_media!==false}/>:<EmptyState title={en?"Outside your team history":"Außerhalb deiner Teamhistorie"} detail={en?"Your player’s team does not take part in this game at this date.":"Das damalige Team deines Spielers nimmt an dieser Partie nicht teil."}/>}
 {notables?.some(x=>x.notes_language===lang)&&<Section title={en?"Elsewhere in the box score":"Außerdem im Boxscore"}>{notables.filter(x=>x.notes_language===lang).map(x=><article className="railStory" key={x.id}><h3>{x.player_name} · {x.team_abbreviation}</h3><p>{x.note}</p></article>)}</Section>}
 <Section title={en?"The game in the media":"Das Spiel in den Medien"}>{media?.length?<div className="mediaStack">{media.map(x=><MediaCard key={x.id} post={x}/>)}</div>:s?<GenerateMediaButton statId={s.id} language={lang}/>:<p className="muted">{en?"Coverage follows the final score.":"Die Berichte folgen dem Endstand."}</p>}</Section></>;
}
