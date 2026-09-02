#!/usr/bin/env python3
"""Generate v0.25 real-player identity pack from Sofascore current team squads.

Uses browser TLS impersonation because Sofascore protects its public JSON endpoints
against plain requests/curl clients. Only public identity facts are imported; all
ratings, contracts, potential and simulation variables remain Basketball Manager data.
"""
from __future__ import annotations
from datetime import datetime, timezone
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading, time

from curl_cffi import requests
from build_real_rosters import ALIASES, GAME_NAMES, SNAPSHOT, OUT, REPORT, norm, js_wrapper

PRIMARY="https://api.sofascore.com/api/v1"
MIRROR="https://api.sofascore.app/api/v1"
HEADERS={"accept":"application/json,text/plain,*/*","accept-language":"en-US,en;q=0.9","referer":"https://www.sofascore.com/"}
_TLS=threading.local()

def session():
    if not getattr(_TLS,"s",None):_TLS.s=requests.Session(impersonate="chrome")
    return _TLS.s

def get_json(path, params=None, retries=2):
    err=None
    for base in (PRIMARY,MIRROR):
        for attempt in range(retries):
            try:
                r=session().get(base+path,params=params,headers=HEADERS,timeout=12)
                if r.status_code==200:return r.json()
                err=RuntimeError(f"HTTP {r.status_code} {r.url}")
            except Exception as e:err=e
            time.sleep(.3*(attempt+1))
    raise err or RuntimeError(path)

def sport_name(ent):
    sport=ent.get("sport") or ent.get("category",{}).get("sport") or {}
    return norm(str(sport.get("slug") or sport.get("name") or ""))

def search_team(cid):
    aliases=ALIASES[cid];best=None;best_score=0.0;alias_norms={norm(a) for a in aliases}
    for alias in aliases[:3]:
        data=get_json("/search/all",{"q":alias})
        results=data.get("results") or data.get("entities") or data.get("items") or []
        for row in results:
            if str(row.get("type","")).lower() not in ("team",""):continue
            ent=row.get("entity") or row.get("team") or row
            if sport_name(ent) not in ("basketball","basket"):continue
            name=ent.get("name") or "";n=norm(name)
            ratio=max(SequenceMatcher(None,n,norm(a)).ratio() for a in aliases)
            if n in alias_norms:ratio=1.0
            elif any(norm(a) in n or n in norm(a) for a in aliases):ratio=max(ratio,.90)
            if ratio>best_score and ent.get("id"):best_score=ratio;best={"id":ent["id"],"name":name,"score":ratio}
        if best_score>=.88:break
    return best if best_score>=.66 else None

def age_from_player(p):
    snap=datetime.fromisoformat(SNAPSHOT).replace(tzinfo=timezone.utc)
    ts=p.get("dateOfBirthTimestamp")
    try:
        if ts:
            d=datetime.fromtimestamp(int(ts),tz=timezone.utc)
            return snap.year-d.year-((snap.month,snap.day)<(d.month,d.day))
    except Exception:pass
    raw=p.get("dateOfBirth")
    if raw:
        try:
            d=datetime.fromisoformat(str(raw)[:10]).replace(tzinfo=timezone.utc)
            return snap.year-d.year-((snap.month,snap.day)<(d.month,d.day))
        except Exception:pass
    return None

def pos_text(p,row):
    v=p.get("position") or row.get("position") or ""
    if isinstance(v,dict):v=v.get("name") or v.get("shortName") or v.get("slug") or ""
    return str(v).upper().strip()

def team_players(team_id):
    data=get_json(f"/team/{team_id}/players");rows=data.get("players") or [];out=[];seen=set()
    for row in rows:
        p=row.get("player") or row;name=(p.get("name") or p.get("shortName") or "").strip()
        if not name or norm(name) in seen:continue
        seen.add(norm(name));item={"name":name,"pos":pos_text(p,row)}
        age=age_from_player(p)
        if age and 15<=age<=50:item["age"]=age
        country=p.get("country") or {};iso=country.get("alpha2") if isinstance(country,dict) else None
        if iso:item["country"]=iso
        if p.get("id") is not None:item["sourceId"]=p["id"]
        out.append(item)
    return out

def collect(cid):
    try:
        t=search_team(cid)
        if not t:return cid,[],None,f"{cid:03d} {GAME_NAMES.get(cid,cid)}: team not confidently resolved"
        roster=team_players(t["id"])
        if not roster:return cid,[],t,f"{cid:03d} {GAME_NAMES.get(cid,cid)}: {t['name']} resolved but roster empty"
        return cid,roster,t,None
    except Exception as e:return cid,[],None,f"{cid:03d} {GAME_NAMES.get(cid,cid)}: {type(e).__name__}: {e}"

def main():
    grouped={str(i):[] for i in range(1,151)};matched_names={};errors=[]
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(collect,cid):cid for cid in range(1,151)}
        for f in as_completed(futures):
            cid,roster,t,err=f.result()
            if roster:
                grouped[str(cid)]=roster;matched_names[cid]=f"{t['name']} (Sofascore {t['id']})";print(cid,t['name'],len(roster),flush=True)
            else:
                errors.append(err);print(cid,"UNRESOLVED",err,flush=True)
    payload={k:v for k,v in grouped.items() if v};covered=len(payload);players=sum(map(len,payload.values()))
    meta={"snapshot":SNAPSHOT,"source":"Sofascore current team roster endpoints","coverage":{"clubs":covered,"totalClubs":150,"players":players},"sourceUrls":["https://www.sofascore.com/","https://api.sofascore.com/api/v1/team/{teamId}/players"]}
    OUT.write_text(js_wrapper(payload,meta),encoding="utf-8")
    lines=["# Real roster snapshot — v0.25","",f"Snapshot: **{SNAPSHOT}**",f"Clubs with current-player data: **{covered}/150**",f"Current player identities collected: **{players}**","","> Identity facts only. Ratings, potential, salaries, contracts, morale and personalities remain Basketball Manager simulation data.","","## Coverage by club",""]
    for cid in range(1,151):lines.append(f"- {cid:03d} · {GAME_NAMES.get(cid,str(cid))}: **{len(grouped[str(cid)])}** · {matched_names.get(cid,'—')}")
    if errors:lines += ["","## Unresolved / empty clubs",""]+[f"- {x}" for x in sorted(errors)]
    REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(f"Generated {players} player identities across {covered}/150 clubs",flush=True)
    if covered<50 or players<500:raise SystemExit(f"Coverage gate failed: {covered} clubs / {players} players")

if __name__=="__main__":main()
