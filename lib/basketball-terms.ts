/** Keep familiar basketball categories, including previously saved grade summaries. */
export function basketballTerms(text:string|null|undefined){
 return (text||"").replace(/\bPunkteproduktion\b/g,"Scoring")
  .replace(/\bSpielgestaltung\b/g,"Playmaking")
  .replace(/\bVerteidigung\b/g,"Defense")
  .replace(/\bEffizienz\b/g,"Efficiency");
}
