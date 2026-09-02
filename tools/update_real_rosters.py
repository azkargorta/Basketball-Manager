#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import time
import unicodedata
from difflib import SequenceMatcher
from io import StringIO
from pathlib import Path
from urllib.parse import quote_plus, urljoin

import pandas as pd
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / 'js' / 'data.js'
OUT_JS = ROOT / 'js' / 'real-rosters-2026-27.generated.js'
REPORT = ROOT / 'REAL_ROSTERS_REPORT.json'
BASE = 'https://basketball.realgm.com'

# One league-player page normally contains every current 2026/27 roster in that league.
# Individual team roster pages are used only as fallback for unmatched/incomplete clubs.
SOURCES = {
    'Liga ACB': 'https://basketball.realgm.com/international/league/4/Spanish-ACB/players',
    'Primera FEB': 'https://basketball.realgm.com/international/league/55/Spanish-LEB-Gold/players',
    'LNB Élite': 'https://basketball.realgm.com/international/league/12/French-Jeep-Elite/players',
    'LBA Serie A': 'https://basketball.realgm.com/international/league/6/Italian-Lega-Basket-Serie-A/players',
    'easyCredit BBL': 'https://basketball.realgm.com/international/league/15/German-BBL/players',
    'Basketbol Süper Ligi': 'https://basketball.realgm.com/international/league/7/Turkish-BSL/players',
    'Greek Basket League': 'https://basketball.realgm.com/international/league/8/Greek-HEBA-A1/players',
    'ABA League': 'https://basketball.realgm.com/international/league/18/Adriatic-League-Liga-ABA/players',
    'LKL': 'https://basketball.realgm.com/international/league/10/Lithuanian-LKL/players',
    'Israeli Premier League': 'https://basketball.realgm.com/international/league/11/Israeli-BSL/players',
    'Liga Nacional Argentina': 'https://basketball.realgm.com/international/league/58/Argentinian-Liga-A/players',
    'NBA': 'https://basketball.realgm.com/nba/players',
}

ALIASES = {
    'Barcelona':'Barca','Asisa Joventut':'Joventut Badalona','Dreamland Gran Canaria':'Gran Canaria',
    'Kids&Us Manresa':'BAXI Manresa','FIATC Girona':'CB Girona','iLERNA Lleida':'Forca Lleida CE',
    'La Laguna Tenerife':'Lenovo Tenerife','Leyma Coruña':'CB Coruna','San Pablo Burgos':'Siblo San Pablo Burgos',
    'Río Breogán':'Rio Breogan','Surne Bilbao':'Bilbao Basket','Fenerbahçe':'Fenerbahce Beko','AS Monaco':'Monaco',
    'Dubai Basketball':'Dubai','Partizán Belgrado':'KK Partizan','Olimpia Milano':'AX Armani Exchange Milan',
    'ASVEL Villeurbanne':'ASVEL Basket','Maccabi Tel Aviv':'Maccabi FOX Tel Aviv','Estrella Roja':'KK Crvena Zvezda',
    'Besiktas':'Besiktas Icrypex','Zalgiris Kaunas':'Zalgiris','Bayern Múnich':'Bayern Munich','Virtus Bolonia':'Virtus Bologna',
    'Flexicar Fuenlabrada':'Baloncesto Fuenlabrada','Palencia Baloncesto':'Zunder Palencia','HLA Alicante':'Lucentum Alicante',
    'Real Valladolid':'Valladolid','Club Ourense Baloncesto':'Ourense Baloncesto','Tizona Burgos':'CB Tizona',
    'JL Bourg':'JL Bourg-en-Bresse','SIG Strasbourg':'Strasbourg IG','Limoges CSP':'CSP Limoges','JDA Dijon':'JDA Dijon Basket',
    'Reyer Venezia':'Umana Venezia','Derthona Basket':'Bertram Tortona','Pallacanestro Reggiana':'Grissin Bon Reggio Emilia',
    'Pallacanestro Trieste':'Pallacanestro Trieste 2004','Dinamo Sassari':'Banco di Sardegna Sassari','Pallacanestro Varese':'OpenJobMetis Varese',
    'ratiopharm Ulm':'Ratiopharm Ulm','Würzburg Baskets':'s.Oliver Baskets','MHP RIESEN Ludwigsburg':'MHP Riesen',
    'NINERS Chemnitz':'BV Chemnitz 99','Basketball Löwen Braunschweig':'Basketball Lowen Braunschweig','ROSTOCK SEAWOLVES':'Rostock Seawolves',
    'Türk Telekom':'Turk Telekom','Bahçeşehir Koleji':'Bahcesehir Koleji','TOFAŞ Bursa':'Tofas SC','Mersin SK':'Mersin BSB',
    'Petkim Spor':'Socar Petkimspor','Darüşşafaka':'Darussafaka','Aris Thessaloniki':'Aris Midea Thessaloniki',
    'PAOK Thessaloniki':'PAOK BC','Promitheas Patras':'ASP Promitheas Patras','Peristeri':'Peristeri Betsson',
    'Budućnost VOLI':'KK Buducnost','Cibona':'KK Cibona','Igokea':'BC Igokea','U-BT Cluj-Napoca':'U-Banca Transilvania Cluj Napoca',
    'Zadar':'KK Zadar','Borac Čačak':'Borac Cacak','HKK Široki':'Siroki','Perspektiva Ilirija':'Ilirija',
    'Lietkabelis':'7Bet-Lietkabelis Panevezys','Neptūnas Klaipėda':'Neptunas','Šiauliai':'Siauliai',
    'Hapoel Holon':'Hapoel Unet Holon','Hapoel Be’er Sheva':'Hapoel Beer Sheva','Instituto Córdoba':'Instituto Atletico Central Cordoba',
    'Olímpico La Banda':'Ciclista Olimpico','San Lorenzo':'San Lorenzo de Almagro','Obras Basket':'Obras Sanitarias',
    'Peñarol Mar del Plata':'Penarol Mar del Plata','Gimnasia Comodoro':'Gimnasia y Esgrima de Comodoro Rivadavia',
}

COUNTRY_CODES = {
    'spain':'ESP','united states':'USA','usa':'USA','serbia':'SRB','france':'FRA','lithuania':'LTU','argentina':'ARG','greece':'GRE',
    'croatia':'CRO','turkey':'TUR','turkiye':'TUR','slovenia':'SLO','germany':'GER','italy':'ITA','israel':'ISR','montenegro':'MNE',
    'bosnia and herzegovina':'BIH','austria':'AUT','romania':'ROU','canada':'CAN','brazil':'BRA','uruguay':'URU','finland':'FIN',
    'poland':'POL','ukraine':'UKR','georgia':'GEO','latvia':'LAT','estonia':'EST','belgium':'BEL','netherlands':'NED','england':'GBR',
    'united kingdom':'GBR','senegal':'SEN','nigeria':'NGA','cameroon':'CMR','angola':'ANG','australia':'AUS','new zealand':'NZL',
    'dominican republic':'DOM','puerto rico':'PUR','bahamas':'BAH','cuba':'CUB','hungary':'HUN','north macedonia':'MKD','macedonia':'MKD',
    'czech republic':'CZE','czechia':'CZE','slovakia':'SVK','sweden':'SWE','denmark':'DEN','iceland':'ISL','portugal':'POR','albania':'ALB',
    'kosovo':'KOS','bulgaria':'BUL','russia':'RUS','belarus':'BLR','ivory coast':'CIV',"cote d'ivoire":'CIV',
    'democratic republic of the congo':'COD','republic of the congo':'COG','mali':'MLI','mexico':'MEX','japan':'JPN','china':'CHN',
    'south sudan':'SSD','cape verde':'CPV','switzerland':'SUI','ireland':'IRL','luxembourg':'LUX','guinea':'GUI','venezuela':'VEN',
}

SESSION=requests.Session()
SESSION.headers.update({'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139 Safari/537.36','Accept-Language':'en-US,en;q=0.8'})

def norm(s):
    s=unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower()
    s=re.sub(r'\b(basketball|basket|club|bc|cb|kk|sk|baloncesto|pallacanestro)\b',' ',s)
    return re.sub(r'[^a-z0-9]+',' ',s).strip()

def similarity(a,b):
    a,b=norm(a),norm(b)
    if not a or not b:return 0.0
    if a in b or b in a:return .93
    return SequenceMatcher(None,a,b).ratio()

def get(url,tries=3):
    err=None
    for i in range(tries):
        try:
            r=SESSION.get(url,timeout=25)
            if r.status_code==200 and len(r.text)>500:return r.text
            err=RuntimeError(f'HTTP {r.status_code}')
        except Exception as e:err=e
        time.sleep(.7+i)
    raise RuntimeError(f'{url}: {err}')

def flatten(df):
    if isinstance(df.columns,pd.MultiIndex):df.columns=[' '.join(str(x) for x in t if str(x)!='nan').strip() for t in df.columns]
    else:df.columns=[str(x).strip() for x in df.columns]
    return df

def find_col(df,*names):
    wanted={norm(x) for x in names}
    for c in df.columns:
        n=norm(c)
        if n in wanted or any(n.endswith(' '+x) for x in wanted):return c
    return None

def choose_players_table(html,need_team=True):
    best=None;best_score=-1
    for df in pd.read_html(StringIO(html)):
        df=flatten(df); cols=[norm(c) for c in df.columns]
        score=5*int(any(c=='player' or c.endswith(' player') for c in cols))
        score+=3*int(any(c=='team' or c.endswith(' team') for c in cols)) if need_team else 0
        score+=int(any(c in {'pos','position'} or c.endswith(' pos') for c in cols))
        score+=min(len(df),200)/200
        if score>best_score:best,best_score=df,score
    threshold=8 if need_team else 5
    if best is None or best_score<threshold:raise RuntimeError('No suitable player table')
    return best

def pos(raw):
    p=re.sub(r'[^A-Z]','',str(raw or '').upper())
    if p in {'PG','SG','SF','PF','C'}:return p
    if p in {'G','PGSG','SGPG'}:return 'PG'
    if p in {'GF','SGSF','SFSG'}:return 'SG'
    if p in {'F','SFPF','PFSF'}:return 'SF'
    if p in {'FC','PFC','CPF'}:return 'PF'
    return 'SF'

def height(raw):
    s=str(raw or '').strip();m=re.search(r"(\d+)\s*[-']\s*(\d+)",s)
    if m:return round((int(m.group(1))*12+int(m.group(2)))*2.54)
    try:
        v=float(s);return round(v) if 150<=v<=240 else None
    except:return None

def nat(raw):
    s=str(raw or '').replace('\xa0',' ').strip()
    if not s or s.lower()=='nan':return None
    first=re.split(r'\n|/|,',s)[0].strip().lower()
    return COUNTRY_CODES.get(first,first[:3].upper() if first else None)

def age(raw):
    try:
        v=int(float(str(raw).strip()));return v if 15<=v<=50 else None
    except:return None

def parse_clubs():
    clubs=[]
    for line in DATA_JS.read_text(encoding='utf-8').splitlines():
        if 'makeClub(' not in line:continue
        m=re.search(r"makeClub\((\d+),'([^']+)'",line); lm=re.search(r"leagueName:'([^']+)'",line)
        if m and lm:clubs.append({'id':int(m.group(1)),'name':m.group(2),'league':lm.group(1)})
    return clubs

def row_to_player(r,pc,poc,hc,nc,ac=None):
    name=str(r.get(pc,'')).strip()
    if not name or name.lower() in {'nan','player'}:return None
    item={'name':name,'position':pos(r.get(poc,'')) if poc else 'SF'}
    h=height(r.get(hc)) if hc else None;n=nat(r.get(nc)) if nc else None;a=age(r.get(ac)) if ac else None
    if h:item['height']=h
    if n:item['nationality']=n
    if a:item['age']=a
    return item

def league_rosters(url):
    df=choose_players_table(get(url),True)
    pc=find_col(df,'Player');tc=find_col(df,'Team');poc=find_col(df,'Pos','Position');hc=find_col(df,'HT','Height');nc=find_col(df,'Nationality');ac=find_col(df,'Age')
    if not pc or not tc:raise RuntimeError('Player/Team columns missing')
    out={}
    for _,r in df.iterrows():
        team=str(r.get(tc,'')).strip()
        item=row_to_player(r,pc,poc,hc,nc,ac)
        if item and team and team.lower()!='nan':
            arr=out.setdefault(team,[])
            if item['name'] not in {x['name'] for x in arr}:arr.append(item)
    return out

def search_team_roster_url(team):
    try:soup=BeautifulSoup(get(f'{BASE}/search?q={quote_plus(team)}',2),'lxml')
    except:return None
    candidates=[]
    for a in soup.find_all('a',href=True):
        if '/team/' in a['href']:
            candidates.append((similarity(team,a.get_text(' ',strip=True)),a['href']))
    if not candidates:return None
    score,href=max(candidates)
    if score<.42:return None
    href=href.split('?')[0].rstrip('/')
    if not href.endswith('/rosters'):href+='/rosters'
    return urljoin(BASE,href)

def team_roster(url):
    df=choose_players_table(get(url),False)
    pc=find_col(df,'Player');poc=find_col(df,'Pos','Position');hc=find_col(df,'HT','Height');nc=find_col(df,'Nationality');ac=find_col(df,'Age')
    if not pc:raise RuntimeError('Player column missing')
    out=[];seen=set()
    for _,r in df.iterrows():
        item=row_to_player(r,pc,poc,hc,nc,ac)
        if item and item['name'] not in seen:seen.add(item['name']);out.append(item)
    return out

def match_team(app_name,rosters):
    target=ALIASES.get(app_name,app_name)
    if not rosters:return None,0
    ranked=sorted(((similarity(target,n),n) for n in rosters),reverse=True)
    return ranked[0][1],ranked[0][0]

def main():
    clubs=parse_clubs();league_data={};source_report={}
    for league,url in SOURCES.items():
        try:
            league_data[league]=league_rosters(url)
            source_report[league]={'url':url,'teams_found':len(league_data[league]),'players_found':sum(map(len,league_data[league].values()))}
            print(league,source_report[league],flush=True)
        except Exception as e:
            league_data[league]={};source_report[league]={'url':url,'error':str(e)};print('SOURCE MISS',league,e,flush=True)

    generated={};missing=[];club_report={}
    for club in clubs:
        groups=league_data.get(club['league'],{})
        matched,score=match_team(club['name'],groups)
        roster=list(groups.get(matched,[])) if matched and score>=.46 else []
        fallback=None
        if len(roster)<8:
            fallback=search_team_roster_url(ALIASES.get(club['name'],club['name']))
            if fallback:
                try:roster=team_roster(fallback)
                except Exception as e:print('FALLBACK FAIL',club['name'],e,flush=True)
        if len(roster)>=8:
            generated[str(club['id'])]=roster
            club_report[str(club['id'])]={'name':club['name'],'league':club['league'],'source_team':matched,'match_score':round(score,3),'players':len(roster),'fallback_url':fallback}
            print(f"OK {club['id']:3d} {club['name']}: {len(roster)}",flush=True)
        else:
            missing.append({'id':club['id'],'name':club['name'],'league':club['league'],'matched':matched,'score':round(score,3),'players':len(roster),'fallback_url':fallback})
            print(f"MISS {club['id']:3d} {club['name']}: {len(roster)}",flush=True)

    players_total=sum(len(v) for v in generated.values());coverage=round(100*len(generated)/max(1,len(clubs)),1)
    report={'snapshot':'2026-09-02','clubs_total':len(clubs),'clubs_complete':len(generated),'players_total':players_total,'coverage_pct':coverage,'sources':source_report,'clubs':club_report,'missing':missing}
    meta={'snapshot':'2026-09-02','source':'RealGM public 2026-27 player/roster pages','clubs':len(generated),'players':players_total,'coveragePct':coverage}
    OUT_JS.write_text("(function(g){\n'use strict';\ng.BBGM_REAL_ROSTERS_202627="+json.dumps(generated,ensure_ascii=False,separators=(',',':'))+';\ng.BBGM_REAL_ROSTERS_META_202627='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+";\n})(typeof globalThis!=='undefined'?globalThis:this);\n",encoding='utf-8')
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'clubs':len(generated),'players':players_total,'coverage_pct':coverage,'missing':len(missing)}),flush=True)
    if len(generated)<100:raise SystemExit('Coverage below 100 clubs; inspect REAL_ROSTERS_REPORT.json')

if __name__=='__main__':main()
