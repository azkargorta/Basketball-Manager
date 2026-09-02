#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import time
import unicodedata
from difflib import SequenceMatcher
from io import StringIO
from pathlib import Path
from urllib.parse import quote_plus

import pandas as pd
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA_JS=ROOT/'js'/'data.js'
OUT_JS=ROOT/'js'/'real-rosters-2026-27.generated.js'
REPORT=ROOT/'REAL_ROSTERS_REPORT.json'
BASE='https://basketball.realgm.com'

SOURCES={
 'Liga ACB':'https://basketball.realgm.com/international/league/4/Spanish-ACB/players',
 'Primera FEB':'https://basketball.realgm.com/international/league/55/Spanish-LEB-Gold/players',
 'LNB Élite':'https://basketball.realgm.com/international/league/12/French-Jeep-Elite/players',
 'LBA Serie A':'https://basketball.realgm.com/international/league/6/Italian-Lega-Basket-Serie-A/players',
 'easyCredit BBL':'https://basketball.realgm.com/international/league/15/German-BBL/players',
 'Basketbol Süper Ligi':'https://basketball.realgm.com/international/league/7/Turkish-BSL/players',
 'Greek Basket League':'https://basketball.realgm.com/international/league/8/Greek-HEBA-A1/players',
 'ABA League':'https://basketball.realgm.com/international/league/18/Adriatic-League-Liga-ABA/players',
 'LKL':'https://basketball.realgm.com/international/league/10/Lithuanian-LKL/players',
 'Israeli Premier League':'https://basketball.realgm.com/international/league/11/Israeli-BSL/players',
 'Liga Nacional Argentina':'https://basketball.realgm.com/international/league/58/Argentinian-Liga-A/players',
 'NBA':'https://basketball.realgm.com/nba/players',
}
ALIASES={
 'Barcelona':'Barca','Asisa Joventut':'Joventut Badalona','Dreamland Gran Canaria':'Gran Canaria','Kids&Us Manresa':'BAXI Manresa',
 'FIATC Girona':'CB Girona','iLERNA Lleida':'Forca Lleida CE','La Laguna Tenerife':'Lenovo Tenerife','Leyma Coruña':'CB Coruna',
 'San Pablo Burgos':'Siblo San Pablo Burgos','Río Breogán':'Rio Breogan','Surne Bilbao':'Bilbao Basket','Fenerbahçe':'Fenerbahce Beko',
 'AS Monaco':'Monaco','Dubai Basketball':'Dubai','Partizán Belgrado':'KK Partizan','Olimpia Milano':'AX Armani Exchange Milan',
 'ASVEL Villeurbanne':'ASVEL Basket','Maccabi Tel Aviv':'Maccabi FOX Tel Aviv','Estrella Roja':'KK Crvena Zvezda','Besiktas':'Besiktas Icrypex',
 'Zalgiris Kaunas':'Zalgiris','Bayern Múnich':'Bayern Munich','Virtus Bolonia':'Virtus Bologna','Flexicar Fuenlabrada':'Baloncesto Fuenlabrada',
 'Palencia Baloncesto':'Zunder Palencia','HLA Alicante':'Lucentum Alicante','Real Valladolid':'Valladolid','Club Ourense Baloncesto':'Ourense Baloncesto',
 'Tizona Burgos':'Grupo Ureta Tizona Burgos','JL Bourg':'JL Bourg-en-Bresse','SIG Strasbourg':'Strasbourg IG','Limoges CSP':'CSP Limoges',
 'JDA Dijon':'JDA Dijon Basket','Reyer Venezia':'Umana Venezia','Derthona Basket':'Bertram Tortona','Pallacanestro Reggiana':'Grissin Bon Reggio Emilia',
 'Pallacanestro Trieste':'Pallacanestro Trieste 2004','Dinamo Sassari':'Banco di Sardegna Sassari','Pallacanestro Varese':'OpenJobMetis Varese',
 'ratiopharm Ulm':'Ratiopharm Ulm','Würzburg Baskets':'s.Oliver Baskets','MHP RIESEN Ludwigsburg':'MHP Riesen','NINERS Chemnitz':'BV Chemnitz 99',
 'Basketball Löwen Braunschweig':'Basketball Lowen Braunschweig','ROSTOCK SEAWOLVES':'Rostock Seawolves','Türk Telekom':'Turk Telekom',
 'Bahçeşehir Koleji':'Bahcesehir Koleji','TOFAŞ Bursa':'Tofas SC','Mersin SK':'Mersin BSB','Petkim Spor':'Socar Petkimspor','Darüşşafaka':'Darussafaka',
 'Aris Thessaloniki':'Aris Midea Thessaloniki','PAOK Thessaloniki':'PAOK BC','Promitheas Patras':'ASP Promitheas Patras','Peristeri':'Peristeri Betsson',
 'Budućnost VOLI':'Buducnost Voli Podgorica','Cedevita Olimpija':'KK Cedevita Olimpija Ljubljana','Cibona':'KK Cibona','Igokea':'BC Igokea',
 'Bosna Sarajevo':'KK Bosna','SC Derby':'Studentski Centar Podgorica','Spartak Subotica':'KK Spartak Subotica','U-BT Cluj-Napoca':'U-Banca Transilvania Cluj Napoca',
 'Zadar':'KK Zadar','Borac Čačak':'KK Borac Cacak','HKK Široki':'Siroki','Perspektiva Ilirija':'Ilirija','Lietkabelis':'7Bet-Lietkabelis Panevezys',
 'Neptūnas Klaipėda':'Neptunas','Šiauliai':'Siauliai','Hapoel Holon':'Hapoel Unet Holon','Hapoel Be’er Sheva':'Hapoel Beer Sheva',
 'Instituto Córdoba':'Instituto Atletico Central Cordoba','Olímpico La Banda':'Ciclista Olimpico','San Lorenzo':'San Lorenzo de Almagro',
 'Obras Basket':'Obras Sanitarias','Peñarol Mar del Plata':'Penarol','Gimnasia Comodoro':'Gimnasia y Esgrima de Comodoro Rivadavia',
 'LA Clippers':'Los Angeles Clippers'
}
COUNTRY_CODES={'spain':'ESP','united states':'USA','usa':'USA','serbia':'SRB','france':'FRA','lithuania':'LTU','argentina':'ARG','greece':'GRE','croatia':'CRO','turkey':'TUR','turkiye':'TUR','slovenia':'SLO','germany':'GER','italy':'ITA','israel':'ISR','montenegro':'MNE','bosnia and herzegovina':'BIH','austria':'AUT','romania':'ROU','canada':'CAN','brazil':'BRA','uruguay':'URU','finland':'FIN','poland':'POL','ukraine':'UKR','georgia':'GEO','latvia':'LAT','estonia':'EST','belgium':'BEL','netherlands':'NED','england':'GBR','united kingdom':'GBR','senegal':'SEN','nigeria':'NGA','cameroon':'CMR','angola':'ANG','australia':'AUS','new zealand':'NZL','dominican republic':'DOM','puerto rico':'PUR','bahamas':'BAH','cuba':'CUB','hungary':'HUN','north macedonia':'MKD','macedonia':'MKD','czech republic':'CZE','czechia':'CZE','slovakia':'SVK','sweden':'SWE','denmark':'DEN','iceland':'ISL','portugal':'POR','albania':'ALB','kosovo':'KOS','bulgaria':'BUL','russia':'RUS','belarus':'BLR','ivory coast':'CIV',"cote d'ivoire":'CIV','democratic republic of the congo':'COD','republic of the congo':'COG','mali':'MLI','mexico':'MEX','japan':'JPN','china':'CHN','south sudan':'SSD','cape verde':'CPV','switzerland':'SUI','ireland':'IRL','luxembourg':'LUX','guinea':'GUI','venezuela':'VEN','panama':'PAN'}

S=requests.Session();S.headers.update({'User-Agent':'Mozilla/5.0','Accept-Language':'en-US,en;q=0.8'})

def norm(s):
 s=unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower();s=re.sub(r'\b(basketball|basket|club|bc|cb|kk|sk|baloncesto|pallacanestro)\b',' ',s);return re.sub(r'[^a-z0-9]+',' ',s).strip()
def similarity(a,b):
 a,b=norm(a),norm(b)
 if not a or not b:return 0.0
 if a in b or b in a:return .93
 return SequenceMatcher(None,a,b).ratio()
def reader_url(url):return 'https://r.jina.ai/'+url
def fetch_doc(url):
 try:
  r=S.get(url,timeout=10)
  if r.status_code==200 and len(r.text)>500:return 'html',r.text
  print(f'direct {r.status_code}: {url}; trying reader',flush=True)
 except Exception as e:print(f'direct error {url}: {e}; trying reader',flush=True)
 rr=S.get(reader_url(url),timeout=45)
 if rr.status_code!=200 or len(rr.text)<200:raise RuntimeError(f'reader HTTP {rr.status_code} for {url}')
 return 'md',rr.text

def clean_md(s):
 s=str(s or '').strip();s=re.sub(r'!\[[^\]]*\]\([^)]*\)','',s);s=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',s);s=s.replace('**','').replace('__','');return s.strip()
def md_player_rows(text,need_team):
 lines=text.splitlines();out=[]
 for i,line in enumerate(lines):
  if '|' not in line or 'Player' not in line:continue
  heads=[clean_md(x) for x in line.strip().strip('|').split('|')]
  nh=[norm(x) for x in heads]
  if not any(x=='player' or x.endswith(' player') for x in nh):continue
  if need_team and not any(x=='team' or x.endswith(' team') for x in nh):continue
  j=i+1
  while j<len(lines) and ('---' in lines[j] or not lines[j].strip()):j+=1
  while j<len(lines) and '|' in lines[j]:
   vals=[clean_md(x) for x in lines[j].strip().strip('|').split('|')]
   if len(vals)>=len(heads):out.append(dict(zip(heads,vals)))
   j+=1
  if out:return out
 return []
def html_player_df(text,need_team):
 best=None;score=-1
 for df in pd.read_html(StringIO(text)):
  if isinstance(df.columns,pd.MultiIndex):df.columns=[' '.join(str(x) for x in t if str(x)!='nan').strip() for t in df.columns]
  else:df.columns=[str(x).strip() for x in df.columns]
  cols=[norm(c) for c in df.columns];s=5*int('player' in cols)+3*int('team' in cols if need_team else True)+int('pos' in cols or 'position' in cols)
  if s>score:best,score=df,s
 if best is None:return []
 return best.to_dict('records')
def get_col(row,*names):
 wanted={norm(n) for n in names}
 for k,v in row.items():
  nk=norm(k)
  if nk in wanted or any(nk.endswith(' '+x) for x in wanted):return v
 return None
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
def age(raw):
 try:
  v=int(float(str(raw).strip()));return v if 15<=v<=50 else None
 except:return None
def nat(raw):
 s=clean_md(raw).replace('\xa0',' ').strip()
 if not s or s.lower()=='nan':return None
 first=re.split(r'\n|/|,',s)[0].strip().lower();return COUNTRY_CODES.get(first,first[:3].upper() if first else None)
def player_from_row(row):
 name=clean_md(get_col(row,'Player'))
 if not name or name.lower() in {'nan','player'}:return None
 item={'name':name,'position':pos(get_col(row,'Pos','Position'))};h=height(get_col(row,'HT','Height'));a=age(get_col(row,'Age'));n=nat(get_col(row,'Nationality'))
 if h:item['height']=h
 if a:item['age']=a
 if n:item['nationality']=n
 return item

def parse_clubs():
 out=[]
 for line in DATA_JS.read_text(encoding='utf-8').splitlines():
  if 'makeClub(' not in line:continue
  m=re.search(r"makeClub\((\d+),'([^']+)'",line);lm=re.search(r"leagueName:'([^']+)'",line)
  if m and lm:out.append({'id':int(m.group(1)),'name':m.group(2),'league':lm.group(1)})
 return out
def league_rosters(url):
 kind,text=fetch_doc(url);rows=md_player_rows(text,True) if kind=='md' else html_player_df(text,True);out={}
 for r in rows:
  team=clean_md(get_col(r,'Team'));p=player_from_row(r)
  if team and p:
   arr=out.setdefault(team,[])
   if p['name'] not in {x['name'] for x in arr}:arr.append(p)
 return out
def match_team(name,groups):
 target=ALIASES.get(name,name)
 if not groups:return None,0
 score,team=max((similarity(target,t),t) for t in groups);return team,score

def realgm_team_root_from_search(team):
 url=f'{BASE}/search?q={quote_plus(team)}'
 try:kind,text=fetch_doc(url)
 except:return None
 links=re.findall(r'\[([^\]]+)\]\((https?://basketball\.realgm\.com/[^)]+/team/\d+/[^)/?#]+)[^)]*\)',text) if kind=='md' else []
 if not links:return None
 scored=sorted((similarity(team,label),href) for label,href in links)
 score,href=scored[-1]
 if score<.35:return None
 m=re.search(r'(https?://basketball\.realgm\.com/(?:international/league/\d+/[^/]+/)?team/\d+/[^/?#]+)',href)
 return m.group(1) if m else href.rstrip('/')
def team_roster(name):
 root=realgm_team_root_from_search(ALIASES.get(name,name))
 if not root:return [],None
 url=root+'/rosters';kind,text=fetch_doc(url);rows=md_player_rows(text,False) if kind=='md' else html_player_df(text,False);out=[];seen=set()
 for r in rows:
  p=player_from_row(r)
  if p and p['name'] not in seen:seen.add(p['name']);out.append(p)
 return out,url

def main():
 clubs=parse_clubs();league_data={};sources={}
 for league,url in SOURCES.items():
  try:
   groups=league_rosters(url);league_data[league]=groups;sources[league]={'url':url,'teams_found':len(groups),'players_found':sum(len(v) for v in groups.values())};print('SOURCE OK',league,sources[league],flush=True)
  except Exception as e:league_data[league]={};sources[league]={'url':url,'error':str(e)};print('SOURCE MISS',league,e,flush=True)
 generated={};missing=[];club_report={}
 for club in clubs:
  groups=league_data.get(club['league'],{});matched,score=match_team(club['name'],groups);roster=list(groups.get(matched,[])) if matched and score>=.44 else [];fallback=None
  if len(roster)<8:
   try:
    alt,fallback=team_roster(club['name'])
    if len(alt)>len(roster):roster=alt
   except Exception as e:print('FALLBACK FAIL',club['name'],e,flush=True)
  if len(roster)>=8:
   generated[str(club['id'])]=roster;club_report[str(club['id'])]={'name':club['name'],'league':club['league'],'source_team':matched,'match_score':round(score,3),'players':len(roster),'fallback_url':fallback};print(f"OK {club['id']:3d} {club['name']}: {len(roster)}",flush=True)
  else:
   missing.append({'id':club['id'],'name':club['name'],'league':club['league'],'matched':matched,'score':round(score,3),'players':len(roster),'fallback_url':fallback});print(f"MISS {club['id']:3d} {club['name']}: {len(roster)}",flush=True)
 players=sum(len(v) for v in generated.values());coverage=round(100*len(generated)/len(clubs),1);report={'snapshot':'2026-09-02','clubs_total':len(clubs),'clubs_complete':len(generated),'players_total':players,'coverage_pct':coverage,'sources':sources,'clubs':club_report,'missing':missing};meta={'snapshot':'2026-09-02','source':'RealGM public pages via direct/reader access','clubs':len(generated),'players':players,'coveragePct':coverage}
 OUT_JS.write_text("(function(g){\n'use strict';\ng.BBGM_REAL_ROSTERS_202627="+json.dumps(generated,ensure_ascii=False,separators=(',',':'))+';\ng.BBGM_REAL_ROSTERS_META_202627='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+";\n})(typeof globalThis!=='undefined'?globalThis:this);\n",encoding='utf-8');REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'clubs':len(generated),'players':players,'coverage_pct':coverage,'missing':len(missing)}),flush=True)
 # Always write the report/data so incomplete cases can be inspected and patched. Fail only below 80%.
 if len(generated)<120:raise SystemExit('Coverage below 120 clubs; inspect REAL_ROSTERS_REPORT.json')

if __name__=='__main__':main()
