export default function TeamBadge({team,small=false}:{team:any;small?:boolean}){
  if(!team) return <span className="teamBadge mutedBadge">TBA</span>;
  const style:any={"--team":team.primary_color||"#5d6b8a","--team2":team.secondary_color||"#141a26"};
  return <span className={`teamBadge ${small?"small":""}`} style={style}>{team.abbreviation}</span>
}
