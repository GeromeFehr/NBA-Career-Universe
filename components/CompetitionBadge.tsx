import {competitionKey} from "@/lib/logo-sources";

const short:Record<string,string>={
  NBA:"NBA",PLAYOFFS:"PO",FINALS:"FIN",CUP:"CUP",ALLSTAR:"ASG",EAST:"E",WEST:"W",DRAFT:"DR"
};

export default function CompetitionBadge({stage,small=false}:{stage?:string;small?:boolean}){
  const key=competitionKey(stage);
  return <span className={`competitionBadge textBadge ${small?"small":""}`} title={stage||"NBA"}>
    {short[key]||"NBA"}
  </span>;
}
