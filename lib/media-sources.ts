/** A reference to a real publication never attributes simulated text to its staff. */
const sources: Record<string,{name:string;url:string}> = {
  ESPN:{name:"ESPN",url:"https://www.espn.com/nba/"},
  "The Athletic":{name:"The Athletic",url:"https://www.nytimes.com/athletic/nba/"},
  "Bleacher Report":{name:"Bleacher Report",url:"https://bleacherreport.com/nba"},
  "NBA.com":{name:"NBA.com",url:"https://www.nba.com/news"},
  "Sports Illustrated":{name:"Sports Illustrated",url:"https://www.si.com/nba"},
};
export const MEDIA_OUTLETS=Object.keys(sources);
export function mediaSource(value:unknown) {
  const key=String(value||"Career Universe");
  return sources[key]||{name:key,url:null};
}
