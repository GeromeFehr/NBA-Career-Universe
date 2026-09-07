export type MediaBucket="news"|"social";

const normalize=(v:any)=>String(v||"").trim().toLowerCase();

const aliases:Record<string,string>={
  "analyse":"analysis","analysis":"analysis","taktik-analyse":"analysis","taktikanalyse":"analysis",
  "spielbericht":"recap","recap":"recap",
  "bericht":"article","article":"article","kolumne":"article","vorbericht":"article","award-radar":"article",
  "beat":"beat",
  "expertenmeinung":"expert","expert":"expert",
  "tv-meinung":"debate","tv meinung":"debate","debate":"debate",
  "gerücht":"rumor","geruecht":"rumor","rumor":"rumor",
  "social media":"social","social-media":"social","social":"social",
  "fanreaktion":"fan","fan reaction":"fan","fan":"fan",
  "hater-post":"hater","hater post":"hater","hater":"hater",
  "meme/kultur":"meme","meme":"meme","culture":"meme",
  "wildcard":"wildcard"
};

export function canonicalMediaKind(value:any){
  const raw=normalize(value);
  return aliases[raw]||raw.replace(/[^a-z0-9]+/g,"_");
}

export function mediaBucket(value:any):MediaBucket{
  const k=canonicalMediaKind(value);
  return ["social","fan","hater","meme","wildcard"].includes(k)?"social":"news";
}

export function mediaKindLabel(value:any,language:"de"|"en"){
  const k=canonicalMediaKind(value);
  const labels:Record<string,{de:string;en:string}>={
    analysis:{de:"Analyse",en:"Analysis"},
    recap:{de:"Spielbericht",en:"Recap"},
    article:{de:"Artikel",en:"Article"},
    beat:{de:"Beat",en:"Beat"},
    expert:{de:"Expertenmeinung",en:"Expert"},
    debate:{de:"TV-Debatte",en:"TV Debate"},
    rumor:{de:"Gerücht",en:"Rumor"},
    social:{de:"Social",en:"Social"},
    fan:{de:"Fanreaktion",en:"Fan Reaction"},
    hater:{de:"Hater-Post",en:"Hater Post"},
    meme:{de:"Meme/Kultur",en:"Meme/Culture"},
    wildcard:{de:"Wildcard",en:"Wildcard"}
  };
  return labels[k]?.[language]||String(value||"");
}
