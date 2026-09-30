"""Refresh the local EA FC club catalog from EA's published ratings metadata.

Usage: python3 scripts/sync-football-catalog.py [--input /path/to/next-data.json]
No credentials or database writes. Supplements cover clubs without rated players.
"""
import argparse
import datetime
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://www.ea.com/games/ea-sports-fc/ratings"
DOMESTIC = {"1", "4", "10", "13", "14", "16", "17", "19", "20", "31", "32", "39", "41", "50", "53", "54", "56", "60", "61", "65", "66", "68", "80", "83", "189", "308", "330", "341", "350", "351", "353", "2012", "2076", "2149", "2215", "2216", "2218", "2221", "2222"}
COUNTRIES = {
    "1": "Dänemark", "4": "Belgien", "10": "Niederlande", "13": "England", "14": "England", "16": "Frankreich", "17": "Frankreich", "19": "Deutschland", "20": "Deutschland", "31": "Italien", "32": "Italien", "39": "USA / Kanada", "41": "Norwegen", "50": "Schottland", "53": "Spanien", "54": "Spanien", "56": "Schweden", "60": "England", "61": "England", "65": "Irland", "66": "Polen", "68": "Türkei", "80": "Österreich", "83": "Südkorea", "189": "Schweiz", "308": "Portugal", "330": "Rumänien", "341": "Mexiko", "350": "Saudi-Arabien", "351": "Australien / Neuseeland", "353": "Argentinien", "2012": "China", "2076": "Deutschland", "2149": "Indien", "2215": "Deutschland", "2216": "England", "2218": "Frankreich", "2221": "USA", "2222": "Spanien",
    "2229": "Niederlande", "2267": "Brasilien", "2271": "Thailand", "2232": "Schweden", "2272": "Norwegen", "2210": "Zypern", "2274": "Bulgarien", "2273": "Island", "2172": "Vereinigte Arabische Emirate", "2231": "Schweiz", "2211": "Ungarn", "2228": "Portugal", "317": "Kroatien", "2244": "Aserbaidschan", "63": "Griechenland", "322": "Finnland", "319": "Tschechien", "2230": "Tschechien", "2236": "Italien", "332": "Ukraine", "2209": "Kolumbien", "2233": "Schottland", "1003": "Südamerika", "1014": "Südamerika"
}

parser = argparse.ArgumentParser()
parser.add_argument("--input", type=Path)
args = parser.parse_args()
if args.input:
    source = json.loads(args.input.read_text())
else:
    request = Request(SOURCE, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=30) as response:
        html = response.read().decode()
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not match:
        raise SystemExit("EA metadata not found; existing catalog was not changed.")
    source = json.loads(match.group(1))
p = source["props"]["pageProps"]
if p["gameDetails"]["slug"] != "fc-27":
    raise SystemExit("New edition detected; review supplements before replacing the catalog.")
supplements = json.loads((ROOT / "data/football-catalog-supplements.json").read_text())
leagues, clubs = {}, {}
for gender in ("men", "women"):
    key = "rest-" + gender
    leagues[key] = {"id": key, "name": "Rest der Welt" + (" · Frauen" if gender == "women" else " · Männer"), "country": "International", "gender": gender, "kind": "rest", "clubs": []}
for group in p["auxData"]["defaultLocaleFilters"]["teamGroups"]:
    gid = str(group["id"])
    gender = "women" if group["gender"]["id"] == 1 else "men"
    country = COUNTRIES[gid]
    if gid in DOMESTIC or gid in {"1003", "1014"}:
        leagues[gid] = {"id": gid, "name": group["label"], "country": country, "gender": gender, "kind": "league" if gid in DOMESTIC else "continental", "clubs": []}
        lid = gid
    else:
        lid = "rest-" + gender
    for team in group["teams"]:
        tid = str(team["id"])
        club = clubs.setdefault(tid, {"id": tid, "name": team["label"], "country": country, "gender": gender, "badge": team["imageUrl"], "leagues": [], "aliases": supplements["aliases"].get(tid, [])})
        if lid not in club["leagues"]:
            club["leagues"].append(lid)
        if tid not in leagues[lid]["clubs"]:
            leagues[lid]["clubs"].append(tid)
        if country != "Südamerika":
            club["country"] = country
for team in supplements["clubs"]:
    tid, lid = team["id"], team["league"]
    if tid in clubs:
        raise SystemExit(f"Supplement {tid} now exists in EA metadata; review it first.")
    clubs[tid] = {"id": tid, "name": team["name"], "country": team["country"], "gender": team["gender"], "badge": None, "leagues": [lid], "aliases": []}
    leagues[lid]["clubs"].append(tid)
result = {"edition": "EA FC 27", "updated": str(datetime.date.today()), "sources": [SOURCE, *supplements["sources"]], "leagues": list(leagues.values()), "clubs": list(clubs.values())}
if len(clubs) < 760 or len(leagues) != 43:
    raise SystemExit("Unexpected catalog size; existing catalog was not changed.")
path = ROOT / "data/football-catalog.json"
path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"{len(clubs)} clubs, {len(leagues)} league/competition groups → {path.relative_to(ROOT)}")
