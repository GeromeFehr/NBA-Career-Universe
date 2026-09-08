export function milestoneRows(stats:any[],language:"de"|"en"){
 const en=language==="en",rows:any[]=[];const highs={points:0,blocks:0};
 const ordered=[...stats].filter(x=>x.appearance_status==="played").sort((a,b)=>String(a.games?.game_date).localeCompare(String(b.games?.game_date))||String(a.game_id).localeCompare(String(b.game_id)));
 for(const s of ordered){const achieved_at=s.games?.game_date||s.created_at;const add=(code:string,title:string,description:string)=>rows.push({game_id:s.game_id,code,title,description,achieved_at});
 if(s.points>=50)add("PTS_50",en?"50-point game":"50-Punkte-Spiel",en?`${s.points} points in one game.`:`${s.points} Punkte in einem Spiel.`);
 if(s.rebounds>=20)add("REB_20",en?"20-rebound game":"20-Rebound-Spiel",`${s.rebounds} REB`);
 if(s.blocks>=10)add("BLK_10",en?"10-block game":"10-Block-Spiel",`${s.blocks} BLK`);
 const cats=[s.points,s.rebounds,s.assists,s.steals,s.blocks];if(cats.filter(x=>Number(x)>=10).length>=3)add("TRIPLE_DOUBLE","Triple-Double",`${s.points} PTS · ${s.rebounds} REB · ${s.assists} AST · ${s.steals} STL · ${s.blocks} BLK`);
 if(cats.every(x=>Number(x)>=5))add("FIVE_BY_FIVE","5×5",en?"At least five in every major category.":"Mindestens fünf in jeder Hauptkategorie.");
 if(s.points>highs.points)add("CAREER_HIGH_PTS",en?"Career-high points":"Karrierebestwert: Punkte",`${s.points} PTS`);
 if(s.blocks>highs.blocks)add("CAREER_HIGH_BLK",en?"Career-high blocks":"Karrierebestwert: Blocks",`${s.blocks} BLK`);
 highs.points=Math.max(highs.points,s.points);highs.blocks=Math.max(highs.blocks,s.blocks);
 }return rows;
}
