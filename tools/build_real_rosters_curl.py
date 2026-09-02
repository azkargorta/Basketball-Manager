#!/usr/bin/env python3
"""Generate the v0.25 real-name roster pack from RealGM using browser TLS."""
from __future__ import annotations
import re, time
from bs4 import BeautifulSoup
from curl_cffi import requests
from build_real_rosters import SOURCES, ALIAS_TO_ID, ALIASES, GAME_NAMES, SNAPSHOT, OUT, REPORT, norm, js_wrapper

HEADERS={
  'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language':'en-US,en;q=0.9',
  'referer':'https://basketball.realgm.com/',
  'upgrade-insecure-requests':'1',
}

def team_id(team):
    n=norm(team)
    if n in ALIAS_TO_ID:return ALIAS_TO_ID[n]
    candidates=[]
    for cid,als in ALIASES.items():
        for a in als:
            an=norm(a)
            if n and (n in an or an in n):candidates.append((abs(len(n)-len(an)),cid))
    if candidates:
        candidates.sort()
        if len(candidates)==1 or candidates[0][0]+3<candidates[1][0]:return candidates[0][1]
    return None

def fetch_page(url):
    last=None
    for imp in ('chrome','chrome124','safari'):
        try:
            r=requests.get(url,headers=HEADERS,impersonate=imp,timeout=30,allow_redirects=True)
            last=(r.status_code,r.text,r.url)
            if r.status_code==200 and '<table' in r.text.lower():return r.text
        except Exception as e:last=e
    if isinstance(last,tuple):raise RuntimeError(f'HTTP {last[0]} {last[2]} sample={last[1][:180]!r}')
    raise RuntimeError(str(last))

def parse(text,label):
    soup=BeautifulSoup(text,'html.parser');out=[]
    tables=soup.find_all('table')
    for table in tables:
        heads=[th.get_text(' ',strip=True) for th in table.find_all('th')]
        header='|'.join(heads)
        if 'Player' not in header:continue
        for tr in table.select('tbody tr'):
            cells=[td.get_text(' ',strip=True) for td in tr.find_all('td')]
            if label=='NBA':
                if len(cells)<7:continue
                # Current NBA page generally: #, Player, Pos, HT, WT, Age, Current Team, ...
                offset=1 if cells[0].isdigit() else 0
                if len(cells)<6+offset:continue
                name,pos,age,team=cells[offset],cells[offset+1],cells[offset+4],cells[offset+5]
                if not name or not team:continue
                item={'name':name,'pos':pos}
                if str(age).isdigit():item['age']=int(age)
            else:
                if len(cells)<5:continue
                name,pos,height,team=cells[0],cells[1],cells[2],cells[4]
                if not name or not team:continue
                item={'name':name,'pos':pos}
                if height and height!='-':item['height']=height
                if len(cells)>=8 and cells[7]:item['nationality']=cells[7]
            out.append((team,item))
        if out:return out
    return out

def main():
    grouped={str(i):[] for i in range(1,151)};seen={str(i):set() for i in range(1,151)};source_names={};errors=[];unmatched={}
    for label,url in SOURCES:
        try:
            html=fetch_page(url);rows=parse(html,label);matched=0
            print(f'{label}: HTML {len(html)} bytes, {len(rows)} player rows',flush=True)
            for team,p in rows:
                cid=team_id(team)
                if not cid:unmatched[team]=unmatched.get(team,0)+1;continue
                key=norm(p['name'])
                if key in seen[str(cid)]:continue
                seen[str(cid)].add(key);grouped[str(cid)].append(p);source_names[cid]=team;matched+=1
            print(f'{label}: {matched} rows matched to game clubs',flush=True)
        except Exception as e:
            errors.append(f'{label}: {type(e).__name__}: {e}');print('ERROR',label,e,flush=True)
        time.sleep(.25)
    payload={k:v for k,v in grouped.items() if v};covered=len(payload);players=sum(len(v) for v in payload.values())
    meta={'snapshot':SNAPSHOT,'source':'RealGM current 2026/27 league player tables','coverage':{'clubs':covered,'totalClubs':150,'players':players},'sourceUrls':[u for _,u in SOURCES]}
    OUT.write_text(js_wrapper(payload,meta),encoding='utf-8')
    lines=['# Real roster snapshot — v0.25','',f'Snapshot: **{SNAPSHOT}**',f'Clubs with current-player data: **{covered}/150**',f'Current player identities collected: **{players}**','', '> Identity facts only. Ratings, potential, salaries, contracts, morale and personalities remain Basketball Manager simulation data.','','## Coverage by club','']
    for cid in range(1,151):lines.append(f'- {cid:03d} · {GAME_NAMES.get(cid,str(cid))}: **{len(grouped[str(cid)])}** · {source_names.get(cid,"—")}')
    if errors:lines += ['','## Source errors','']+[f'- {x}' for x in errors]
    if unmatched:lines += ['','## Source teams not represented/matched in the game','']+[f'- {k}: {v} players' for k,v in sorted(unmatched.items(),key=lambda kv:-kv[1])]
    REPORT.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(f'Generated {players} identities across {covered}/150 clubs',flush=True)
    if covered<75 or players<800:raise SystemExit(f'Coverage gate failed: {covered} clubs / {players} players')

if __name__=='__main__':main()
