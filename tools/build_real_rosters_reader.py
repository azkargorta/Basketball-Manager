#!/usr/bin/env python3
"""Build v0.25 real-name roster pack from current 2026/27 league player tables.

The source tables are public RealGM pages. The build reads them through Jina Reader so
CI does not hit RealGM directly (direct cloud-runner traffic is blocked with HTTP 403).
Only public identity facts are imported into the game; game ratings/contracts stay ours.
"""
from __future__ import annotations
import re, time
import requests
from build_real_rosters import SOURCES, ALIAS_TO_ID, ALIASES, GAME_NAMES, SNAPSHOT, OUT, REPORT, norm, js_wrapper

READER="https://r.jina.ai/"
HEADERS={"Accept":"text/plain","User-Agent":"BasketballManagerPrivateBeta/0.25"}

def read_page(url):
    r=requests.get(READER+url,headers=HEADERS,timeout=90)
    r.raise_for_status()
    return r.text

def team_id(team):
    n=norm(team)
    if n in ALIAS_TO_ID:return ALIAS_TO_ID[n]
    # Conservative fuzzy/substring fallback; never pick a weak match.
    candidates=[]
    for cid,als in ALIASES.items():
        for a in als:
            an=norm(a)
            if n and (n in an or an in n):candidates.append((abs(len(n)-len(an)),cid))
    if candidates:
        candidates.sort()
        if len(candidates)==1 or candidates[0][0]+3<candidates[1][0]:return candidates[0][1]
    return None

def clean_cell(x):
    x=re.sub(r"\[[^\]]*\]\([^\)]*\)","",x)
    return re.sub(r"\s+"," ",x).strip()

def parse_table(text,label):
    out=[]
    for raw in text.splitlines():
        line=raw.strip().strip('|').strip()
        if '|' not in line or line.startswith('---'):continue
        cells=[clean_cell(x) for x in line.split('|')]
        if label=='NBA':
            # # | Player | Pos | HT | WT | Age | Current Team | ...
            if len(cells)<7 or cells[1].lower()=='player' or not cells[5].isdigit():continue
            name,pos,age,team=cells[1],cells[2],int(cells[5]),cells[6]
            if not name or not team:continue
            out.append((team,{"name":name,"pos":pos,"age":age}))
        else:
            # Player | Pos | HT | WT | Team | Birth City | Draft Status | Nationality
            if len(cells)<5 or cells[0].lower()=='player':continue
            name,pos,team=cells[0],cells[1],cells[4]
            if not name or not team or len(name)>80:continue
            item={"name":name,"pos":pos}
            if len(cells)>=8 and cells[7]:item['nationality']=cells[7]
            if len(cells)>=3 and cells[2] and cells[2]!='-':item['height']=cells[2]
            out.append((team,item))
    return out

def main():
    grouped={str(i):[] for i in range(1,151)};seen={str(i):set() for i in range(1,151)};source_names={};errors=[];unmatched={}
    for label,url in SOURCES:
        try:
            text=read_page(url);rows=parse_table(text,label);matched=0
            for team,p in rows:
                cid=team_id(team)
                if not cid:
                    unmatched[team]=unmatched.get(team,0)+1;continue
                key=norm(p['name'])
                if key in seen[str(cid)]:continue
                seen[str(cid)].add(key);grouped[str(cid)].append(p);source_names[cid]=team;matched+=1
            print(f"{label}: {len(rows)} rows, {matched} matched",flush=True)
        except Exception as e:
            errors.append(f"{label}: {type(e).__name__}: {e}");print('ERROR',label,e,flush=True)
        time.sleep(.35)
    payload={k:v for k,v in grouped.items() if v};covered=len(payload);players=sum(len(v) for v in payload.values())
    meta={"snapshot":SNAPSHOT,"source":"RealGM 2026/27 league player tables via text reader","coverage":{"clubs":covered,"totalClubs":150,"players":players},"sourceUrls":[u for _,u in SOURCES]}
    OUT.write_text(js_wrapper(payload,meta),encoding='utf-8')
    lines=["# Real roster snapshot — v0.25","",f"Snapshot: **{SNAPSHOT}**",f"Clubs with current-player data: **{covered}/150**",f"Current player identities collected: **{players}**","","> Identity facts only. Ratings, potential, salaries, contracts, morale and personalities remain Basketball Manager simulation data.","","## Coverage by club",""]
    for cid in range(1,151):lines.append(f"- {cid:03d} · {GAME_NAMES.get(cid,str(cid))}: **{len(grouped[str(cid)])}** · {source_names.get(cid,'—')}")
    if errors:lines += ["","## Source errors",""]+[f"- {x}" for x in errors]
    if unmatched:
        lines += ["","## Source teams not represented/matched in the game",""]+[f"- {k}: {v} players" for k,v in sorted(unmatched.items(),key=lambda kv:-kv[1])]
    REPORT.write_text("\n".join(lines)+"\n",encoding='utf-8')
    print(f"Generated {players} identities across {covered}/150 clubs",flush=True)
    if covered<75 or players<800:raise SystemExit(f"Coverage gate failed: {covered} clubs / {players} players")

if __name__=='__main__':main()
