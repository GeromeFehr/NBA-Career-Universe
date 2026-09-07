insert into teams(abbreviation,city,name,conference,division,primary_color,secondary_color)
values ('ATL','Atlanta','Hawks','East','Southeast','#E03A3E','#C1D32F'),('BOS','Boston','Celtics','East','Atlantic','#007A33','#BA9653'),('BKN','Brooklyn','Nets','East','Atlantic','#000000','#FFFFFF'),('CHA','Charlotte','Hornets','East','Southeast','#1D1160','#00788C'),('CHI','Chicago','Bulls','East','Central','#CE1141','#000000'),('CLE','Cleveland','Cavaliers','East','Central','#860038','#FDBB30'),('DAL','Dallas','Mavericks','West','Southwest','#00538C','#B8C4CA'),('DEN','Denver','Nuggets','West','Northwest','#0E2240','#FEC524'),('DET','Detroit','Pistons','East','Central','#C8102E','#1D42BA'),('GSW','Golden State','Warriors','West','Pacific','#1D428A','#FFC72C'),('HOU','Houston','Rockets','West','Southwest','#CE1141','#000000'),('IND','Indiana','Pacers','East','Central','#002D62','#FDBB30'),('LAC','Los Angeles','Clippers','West','Pacific','#C8102E','#1D428A'),('LAL','Los Angeles','Lakers','West','Pacific','#552583','#FDB927'),('MEM','Memphis','Grizzlies','West','Southwest','#5D76A9','#12173F'),('MIA','Miami','Heat','East','Southeast','#98002E','#F9A01B'),('MIL','Milwaukee','Bucks','East','Central','#00471B','#EEE1C6'),('MIN','Minnesota','Timberwolves','West','Northwest','#0C2340','#236192'),('NOP','New Orleans','Pelicans','West','Southwest','#0C2340','#C8102E'),('NYK','New York','Knicks','East','Atlantic','#006BB6','#F58426'),('OKC','Oklahoma City','Thunder','West','Northwest','#007AC1','#EF3B24'),('ORL','Orlando','Magic','East','Southeast','#0077C0','#C4CED4'),('PHI','Philadelphia','76ers','East','Atlantic','#006BB6','#ED174C'),('PHX','Phoenix','Suns','West','Pacific','#1D1160','#E56020'),('POR','Portland','Trail Blazers','West','Northwest','#E03A3E','#000000'),('SAC','Sacramento','Kings','West','Pacific','#5A2D81','#63727A'),('SAS','San Antonio','Spurs','West','Southwest','#C4CED4','#000000'),('TOR','Toronto','Raptors','East','Atlantic','#CE1141','#000000'),('UTA','Utah','Jazz','West','Northwest','#002B5C','#F9A01B'),('WAS','Washington','Wizards','East','Southeast','#002B5C','#E31837')
on conflict(abbreviation) do update set city=excluded.city,name=excluded.name,conference=excluded.conference,division=excluded.division,primary_color=excluded.primary_color,secondary_color=excluded.secondary_color;

insert into seasons(label,start_date,end_date,current)
values('2026-27','2026-10-20','2027-04-11',true)
on conflict(label) do update set start_date=excluded.start_date,end_date=excluded.end_date,current=true;

insert into career_profiles(player_name,position,overall,draft_year,draft_round,draft_pick,current_team_id,rookie_season_id,universe_date)
select 'G. Fehr','SG/SF',99,2026,1,6,t.id,s.id,'2026-10-21'
from teams t,seasons s where t.abbreviation='GSW' and s.label='2026-27'
and not exists(select 1 from career_profiles);

insert into world_settings(career_id,universe_date,current_season_id)
select c.id,c.universe_date,s.id from career_profiles c,seasons s where s.label='2026-27'
on conflict(career_id) do nothing;

insert into team_stints(career_id,team_id,start_date,acquisition)
select c.id,c.current_team_id,'2026-10-20','Rookie season / MyNBA setup'
from career_profiles c where not exists(select 1 from team_stints x where x.career_id=c.id);

insert into games(season_id,source_key,external_id,game_date,game_day,stage,away_team_id,home_team_id,away_score,home_score,status,data_source,counts_toward_standings)
select s.id,'2026-10-21_GSW_LAL','seed-gsw-lal-20261021','2026-10-21T22:00:00-04:00','2026-10-21','Regular Season',a.id,h.id,128,92,'completed','seed',true
from seasons s,teams a,teams h
where s.label='2026-27' and a.abbreviation='GSW' and h.abbreviation='LAL'
on conflict(source_key) do update set away_score=128,home_score=92,status='completed';

insert into player_game_stats(career_id,game_id,team_id,appearance_status,minutes,points,rebounds,assists,steals,blocks,turnovers,fouls,fgm,fga,tpm,tpa,ftm,fta,plus_minus,started,story_notes)
select c.id,g.id,t.id,'played',28,50,21,6,1,11,2,2,18,33,3,9,11,12,36,true,
'NBA-Debüt: historisch auffällige 50/21/6-Line mit 11 Blocks beim deutlichen Sieg gegen die Lakers.'
from career_profiles c,games g,teams t
where g.source_key='2026-10-21_GSW_LAL' and t.abbreviation='GSW'
on conflict(career_id,game_id) do update set points=50,rebounds=21,assists=6,steals=1,blocks=11,turnovers=2,fgm=18,fga=33,tpm=3,tpa=9,ftm=11,fta=12,plus_minus=36,minutes=28;

insert into milestones(career_id,game_id,code,title,description)
select c.id,g.id,x.code,x.title,x.description from career_profiles c,games g,
(values
 ('PTS_50','50-Punkte-Spiel','50 Punkte beim NBA-Debüt.'),
 ('REB_20','20-Rebound-Spiel','21 Rebounds beim NBA-Debüt.'),
 ('BLK_10','10-Block-Spiel','11 Blocks beim NBA-Debüt.'),
 ('TRIPLE_DOUBLE','Triple-Double','50 Punkte, 21 Rebounds und 11 Blocks.')
) as x(code,title,description)
where g.source_key='2026-10-21_GSW_LAL'
on conflict(career_id,game_id,code) do nothing;

insert into career_events(career_id,event_date,event_type,title,description,metadata)
select c.id,'2026-10-21','debut','NBA debut detonates the storyline',
'50 Punkte, 21 Rebounds, 6 Assists und 11 Blocks in 28 Minuten gegen die Lakers.',
jsonb_build_object('game_source_key','2026-10-21_GSW_LAL')
from career_profiles c
where not exists(select 1 from career_events e where e.career_id=c.id and e.event_type='debut');

insert into story_arcs(career_id,category,title,summary,status,intensity,started_on)
select c.id,'rookie_hype','Kann ein Rookie sofort die Liga übernehmen?',
'Nach dem extremen Debüt kippt die öffentliche Debatte von Rookie-of-the-Year-Fragen hin zu größeren Erwartungen. Gegnerisches Counter-Scouting wird Teil der nächsten Spiele.','active',92,'2026-10-21'
from career_profiles c
where not exists(select 1 from story_arcs a where a.career_id=c.id and a.title='Kann ein Rookie sofort die Liga übernehmen?');

insert into media_posts(career_id,game_id,player_stat_id,outlet,kind,author_name,tone,headline,body,virality,generation_source)
select c.id,g.id,p.id,v.outlet,v.kind,v.author_name,v.tone,v.headline,v.body,v.virality,'seed'
from career_profiles c
join games g on g.source_key='2026-10-21_GSW_LAL'
join player_game_stats p on p.career_id=c.id and p.game_id=g.id
cross join (values
 ('National Hoops Network','analysis','Mara Cole','analytical','50/21/11 ist kein Rookie-Boxscore','G. Fehr hat sein NBA-Debüt nicht nur gewonnen, sondern die komplette Erwartungshaltung verändert. Elf Blocks machen aus der 50-Punkte-Story gleichzeitig eine Defensivgeschichte.',96),
 ('Bay Beat','beat','Avery Lin','local','Golden State hat plötzlich eine neue Hierarchie-Frage','28 Minuten reichten für eine Statline, die normalerweise mehrere Schlagzeilen gleichzeitig verdient. Jetzt beginnt die interessantere Phase: Wie reagieren Coaches und Gegner auf das erste Tape?',82),
 ('HoopsTalk','social','@HoopsTalkLive','hype','DAS WAR SEIN ERSTES NBA-SPIEL.','50 PTS. 21 REB. 11 BLK. Rookie debut. Das ist kein normaler Einstieg in die Liga.',99),
 ('Fourth Quarter Replies','social','@NoEasyBuckets','critical','Ich will Spiel zwei sehen','Monsterzahlen, keine Frage. Aber genau jetzt beginnt das echte Scouting. Wenn die nächsten Gegner ihn anders verteidigen, sehen wir, wie belastbar die Explosion wirklich ist.',77)
) as v(outlet,kind,author_name,tone,headline,body,virality)
where not exists(select 1 from media_posts m where m.career_id=c.id);
