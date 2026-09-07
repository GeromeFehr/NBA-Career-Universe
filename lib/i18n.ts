export type AppLanguage="de"|"en";

export function langOf(universe:any):AppLanguage{
  return universe?.language==="en"?"en":"de";
}

const dict={
  de:{
    feed:"Feed",schedule:"Spielplan",career:"Karriere",news:"News",social:"Social",trades:"Trades",awards:"Awards",
    control:"Control Room",universes:"Universen",settings:"Einstellungen",nextGame:"Nächstes Spiel",
    openStats:"Spiel öffnen & Stats eintragen →",noNext:"Kein kommendes Spiel im aktuellen Datenbestand.",
    seasonDashboard:"Saison-Dashboard",fullCareer:"volle Karriere →",newsroom:"Newsroom",allReports:"alle Berichte →",
    activeStories:"Aktive Storylines",milestones:"Milestones",careerSchedule:"Karriere-Spielplan",
    regularSeason:"Regular Season",games:"Spiele",allTeams:"Alle Teams",allMonths:"Alle Monate",allStatus:"Alle Status",
    planned:"Geplant",final:"Final",searchTeam:"Team suchen…",mediaReports:"Medienberichte",timeline:"Timeline",
    tradeCenter:"Trade Center",leagueInterest:"Interesse ligaweit",setup:"Setup & Architektur",
    language:"Sprache",german:"Deutsch",english:"English",save:"Speichern",account:"Account",activeUniverse:"Aktives Universe",
    privacy:"Datenschutz",ai:"KI",careerValues:"Karrierewerte",injuries:"Verletzungen",gameLog:"Game Log",
    public:"Öffentlich",private:"Privat"
  },
  en:{
    feed:"Feed",schedule:"Schedule",career:"Career",news:"News",social:"Social",trades:"Trades",awards:"Awards",
    control:"Control Room",universes:"Universes",settings:"Settings",nextGame:"Next Game",
    openStats:"Open game & enter stats →",noNext:"No upcoming game in the current data set.",
    seasonDashboard:"Season Dashboard",fullCareer:"full career →",newsroom:"Newsroom",allReports:"all reports →",
    activeStories:"Active Storylines",milestones:"Milestones",careerSchedule:"Career Schedule",
    regularSeason:"Regular Season",games:"Games",allTeams:"All Teams",allMonths:"All Months",allStatus:"All Status",
    planned:"Scheduled",final:"Final",searchTeam:"Search team…",mediaReports:"Media Coverage",timeline:"Timeline",
    tradeCenter:"Trade Center",leagueInterest:"League-wide Interest",setup:"Setup & Architecture",
    language:"Language",german:"Deutsch",english:"English",save:"Save",account:"Account",activeUniverse:"Active Universe",
    privacy:"Privacy",ai:"AI",careerValues:"Career Stats",injuries:"Injuries",gameLog:"Game Log",
    public:"Public",private:"Private"
  }
} as const;

export function t(language:AppLanguage,key:keyof typeof dict.de){
  return dict[language][key]||dict.de[key];
}
