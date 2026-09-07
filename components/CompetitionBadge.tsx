import {competitionKey} from "@/lib/logo-sources";

export default function CompetitionBadge({stage,small=false}:{stage?:string;small?:boolean}){
  const key=competitionKey(stage);
  return <span className={`competitionBadge ${small?"small":""}`} title={stage||"NBA"}>
    <img src={`/api/logo/event/${key}`} alt={stage||"NBA"}/>
  </span>;
}
