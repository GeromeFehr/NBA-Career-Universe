-- Normalize existing localized AI media kind values into stable machine-readable keys.
update media_posts set kind='analysis' where lower(kind) in ('analyse','taktik-analyse','taktikanalyse');
update media_posts set kind='recap' where lower(kind)='spielbericht';
update media_posts set kind='article' where lower(kind) in ('artikel','bericht','kolumne','vorbericht','award-radar');
update media_posts set kind='expert' where lower(kind)='expertenmeinung';
update media_posts set kind='debate' where lower(kind) in ('tv-meinung','tv meinung');
update media_posts set kind='social' where lower(kind) in ('social media','social-media');
update media_posts set kind='fan' where lower(kind)='fanreaktion';
update media_posts set kind='hater' where lower(kind) in ('hater-post','hater post');
update media_posts set kind='meme' where lower(kind) in ('meme/kultur','culture');
update media_posts set kind='rumor' where lower(kind) in ('gerücht','geruecht');
