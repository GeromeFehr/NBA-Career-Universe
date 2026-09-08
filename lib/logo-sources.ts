export const SPORTSLOGOS_CREDIT="https://www.sportslogos.net/teams/list_by_year/62026/2026-NBA-Logos-By-Year/";

export const TEAM_LOGO_PAGES:Record<string,string>={
  ATL:"https://www.sportslogos.net/logos/view/22081902021/Atlanta-Hawks-Logo/2025-2026/Primary-Logo",
  BOS:"https://www.sportslogos.net/logos/view/slhg02hbef3j1ov4lsnwyol5o/Boston-Celtics-Logo/2025-2026/Primary-Logo",
  BKN:"https://www.sportslogos.net/logos/view/378615012025/Brooklyn-Nets-Logo/2025-2026/Primary-Logo",
  CHA:"https://www.sportslogos.net/logos/view/512019262015/Charlotte-Hornets-Logo/2025-2026/Primary-Logo",
  CHI:"https://www.sportslogos.net/logos/view/hj3gmh82w9hffmeh3fjm5h874/Chicago-Bulls-Logo/2025-2026/Primary-Logo",
  CLE:"https://www.sportslogos.net/logos/view/22253692023/Cleveland-Cavaliers-Logo/2025-2026/Primary-Logo",
  DAL:"https://www.sportslogos.net/logos/view/22834632018/Dallas-Mavericks-Logo/2025-2026/Primary-Logo",
  DEN:"https://www.sportslogos.net/logos/view/22989262019/Denver-Nuggets-Logo/2025-2026/Primary-Logo",
  DET:"https://www.sportslogos.net/logos/view/22321642018/Detroit-Pistons-Logo/2025-2026/Primary-Logo",
  GSW:"https://www.sportslogos.net/logos/view/23531522020/Golden-State-Warriors-Logo/2025-2026/Primary-Logo",
  HOU:"https://www.sportslogos.net/logos/view/23068302020/Houston-Rockets-Logo/2025-2026/Primary-Logo",
  IND:"https://www.sportslogos.net/logos/view/22496872026/Indiana-Pacers-Logo/2025-2026/Primary-Logo",
  LAC:"https://www.sportslogos.net/logos/view/23655422025/Los-Angeles-Clippers-Logo/2025-2026/Primary-Logo",
  LAL:"https://www.sportslogos.net/logos/view/23773242024/Los-Angeles-Lakers-Logo/2025-2026/Primary-Logo",
  MEM:"https://www.sportslogos.net/logos/view/23143732019/Memphis-Grizzlies-Logo/2025-2026/Primary-Logo",
  MIA:"https://www.sportslogos.net/logos/view/burm5gh2wvjti3xhei5h16k8e/Miami-Heat-Logo/2025-2026/Primary-Logo",
  MIL:"https://www.sportslogos.net/logos/view/22582752016/Milwaukee-Bucks-Logo/2025-2026/Primary-Logo",
  MIN:"https://www.sportslogos.net/logos/view/23296692018/Minnesota-Timberwolves-Logo/2025-2026/Primary-Logo",
  NOP:"https://www.sportslogos.net/logos/view/496292922024/New-Orleans-Pelicans-Logo/2025-2026/Primary-Logo",
  NYK:"https://www.sportslogos.net/logos/view/21671702024/New-York-Knicks-Logo/2025-2026/Primary-Logo",
  OKC:"https://www.sportslogos.net/logos/view/khmovcnezy06c3nm05ccn0oj2/Oklahoma-City-Thunder-Logo/2025-2026/Primary-Logo",
  ORL:"https://www.sportslogos.net/logos/view/21794952026/Orlando-Magic-Logo/2025-2026/Primary-Logo",
  PHI:"https://www.sportslogos.net/logos/view/21870342016/Philadelphia-76ers-Logo/2025-2026/Primary-Logo",
  PHX:"https://www.sportslogos.net/logos/view/23843702014/Phoenix-Suns-Logo/2025-2026/Primary-Logo",
  POR:"https://www.sportslogos.net/logos/view/23997252018/Portland-Trail-Blazers-Logo/2025-2026/Primary-Logo",
  SAC:"https://www.sportslogos.net/logos/view/24040432017/Sacramento-Kings-Logo/2025-2026/Primary-Logo",
  SAS:"https://www.sportslogos.net/logos/view/23325472018/San-Antonio-Spurs-Logo/2025-2026/Primary-Logo",
  TOR:"https://www.sportslogos.net/logos/view/22770242021/Toronto-Raptors-Logo/2025-2026/Primary-Logo",
  UTA:"https://www.sportslogos.net/logos/view/23451062026/Utah-Jazz-Logo/2025-2026/Primary-Logo",
  WAS:"https://www.sportslogos.net/logos/view/21956712016/Washington-Wizards-Logo/2025-2026/Primary-Logo"
};

export const EVENT_LOGO_PAGES:Record<string,string>={
  NBA:"https://www.sportslogos.net/logos/view/98281472018/National-Basketball-Association-Logo/2025-2026/Primary-Logo",
  PLAYOFFS:"https://www.sportslogos.net/logos/view/98147852022/NBA-Playoffs-Logo/2025-2026/Primary-Logo",
  FINALS:"https://www.sportslogos.net/logos/view/666243712026/NBA-Finals-Logo/2026/Primary-Logo",
  CUP:"https://www.sportslogos.net/logos/view/687528942025/Emirates-NBA-Cup-Logo/2025-2026/Primary-Logo",
  ALLSTAR:"https://www.sportslogos.net/logos/view/98096712026/NBA-All-Star-Game-Logo/2026/Primary-Logo",
  EAST:"https://www.sportslogos.net/logos/view/99995152018/NBA-Eastern-Conference-Logo/2025-2026/Primary-Logo",
  WEST:"https://www.sportslogos.net/logos/view/100139262018/NBA-Western-Conference-Logo/2025-2026/Primary-Logo",
  DRAFT:"https://www.sportslogos.net/logos/view/305235412026/NBA-Draft-Logo/2026/Primary-Logo"
};

export function competitionKey(stage?:string){
  const s=String(stage||"").toLowerCase();
  if(s.includes("nba finals")||s==="finals")return "FINALS";
  if(s.includes("cup"))return "CUP";
  if(s.includes("all-star")||s.includes("all star"))return "ALLSTAR";
  if(s.includes("playoff")||s.includes("play-in")||s.includes("conference"))return "PLAYOFFS";
  return "NBA";
}
