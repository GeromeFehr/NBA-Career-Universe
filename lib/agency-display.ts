export function money(value:number,language:"de"|"en") {return new Intl.NumberFormat(language==="en"?"en-US":"de-DE",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(value)||0);}
export function addYears(date:string,n:number){
 const d=new Date(date+"T12:00:00Z"),month=d.getUTCMonth();
 d.setUTCFullYear(d.getUTCFullYear()+n);
 if(d.getUTCMonth()!==month)d.setUTCDate(0);
 return d.toISOString().slice(0,10);
}

export type CareerContract={
 id:string;kind:string;category:string;brand:string;status:string;annual_value:number;
 signing_bonus:number;agent_fee_pct:number;start_date:string;end_date:string;
 expires_on:string;signed_at:string|null;terms:unknown;
};

/** Signed history remains binding when a user moves the career date backwards. */
export function overlaps(a:Pick<CareerContract,"start_date"|"end_date"|"category">,b:Pick<CareerContract,"start_date"|"end_date"|"category">){
 return a.category===b.category&&a.start_date<b.end_date&&a.end_date>b.start_date;
}

export function contractState(contract:CareerContract,date:string){
 if(contract.signed_at){
  if(contract.end_date<=date)return "expired";
  if(contract.start_date>date)return "upcoming";
  return "active";
 }
 if(contract.status==="offered"&&(contract.expires_on<date||contract.end_date<=date))return "expired";
 return contract.status;
}

export function offerConflict(offer:CareerContract,contracts:CareerContract[],date:string){
 const effective=offer.kind==="sponsorship"?{...offer,start_date:date,end_date:addYears(date,2)}:offer;
 return contracts.find(other=>other.id!==offer.id&&Boolean(other.signed_at)&&overlaps(effective,other));
}
