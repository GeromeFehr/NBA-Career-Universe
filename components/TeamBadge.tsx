export default function TeamBadge({team,small=false}:{team:any;small?:boolean}){
  if(!team) return <span className={`teamBadge mutedBadge ${small?"small":""}`}>TBA</span>;
  const style:any={"--team":team.primary_color||"#5d6b8a","--team2":team.secondary_color||"#141a26"};
  return <span className={`teamBadge logoBadge ${small?"small":""}`} style={style} title={`${team.city||""} ${team.name||""}`.trim()}>
    <span className="logoFallback">{team.abbreviation}</span>
    <img src={`/api/logo/team/${team.abbreviation}`} alt={`${team.city||""} ${team.name||""} Logo`.trim()}/>
  </span>
}
