#!/usr/bin/env python3
from __future__ import annotations
import json,re,time,unicodedata
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'js'/'data.js'
OUT=ROOT/'js'/'real-rosters-2026-27.generated.js'
REPORT=ROOT/'REAL_ROSTERS_REPORT.json'
BASE='https://www.thesportsdb.com/api/v1/json/123'
S=requests.Session();S.headers.update({'User-Agent':'Basketball-Manager-roster-builder/1.0'})

ALIASES={
'Asisa Joventut':'Joventut Badalona','Dreamland Gran Canaria':'Gran Canaria','FIATC Girona':'CB Girona','iLERNA Lleida':'Forca Lleida','Kids&Us Manresa':'BAXI Manresa','La Laguna Tenerife':'Lenovo Tenerife','Leyma Coruña':'CB Coruna','Monbus Obradoiro':'Obradoiro','Río Breogán':'Rio Breogan','Surne Bilbao':'Bilbao Basket','Partizán Belgrado':'Partizan','Olimpia Milano':'Olimpia Milano','Estrella Roja':'Crvena Zvezda','Zalgiris Kaunas':'Zalgiris','Bayern Múnich':'Bayern Munich','Virtus Bolonia':'Virtus Bologna','Flexicar Fuenlabrada':'Fuenlabrada','Palencia Baloncesto':'Palencia','HLA Alicante':'Lucentum Alicante','Real Valladolid':'Valladolid','Club Ourense Baloncesto':'Ourense','Tizona Burgos':'Tizona Burgos','JL Bourg':'Bourg-en-Bresse','SIG Strasbourg':'Strasbourg','Limoges CSP':'Limoges','JDA Dijon':'Dijon','Reyer Venezia':'Venezia','Derthona Basket':'Tortona','Pallacanestro Reggiana':'Reggiana','Pallacanestro Trieste':'Trieste','Dinamo Sassari':'Sassari','Pallacanestro Varese':'Varese','ratiopharm Ulm':'Ulm','Würzburg Baskets':'Wurzburg','MHP RIESEN Ludwigsburg':'Ludwigsburg','NINERS Chemnitz':'Chemnitz','Basketball Löwen Braunschweig':'Braunschweig','ROSTOCK SEAWOLVES':'Rostock Seawolves','Türk Telekom':'Turk Telekom','Bahçeşehir Koleji':'Bahcesehir','TOFAŞ Bursa':'Tofas','Darüşşafaka':'Darussafaka','Aris Thessaloniki':'Aris','PAOK Thessaloniki':'PAOK','Promitheas Patras':'Promitheas','Budućnost VOLI':'Buducnost','Cedevita Olimpija':'Cedevita Olimpija','Cibona':'Cibona Zagreb','Igokea':'Igokea','Bosna Sarajevo':'Bosna','SC Derby':'Studentski Centar','Spartak Subotica':'Spartak Subotica','U-BT Cluj-Napoca':'Cluj Napoca','Borac Čačak':'Borac Cacak','HKK Široki':'Siroki','Perspektiva Ilirija':'Ilirija','Neptūnas Klaipėda':'Neptunas','Šiauliai':'Siauliai','Instituto Córdoba':'Instituto Cordoba','Olímpico La Banda':'Olimpico La Banda','Peñarol Mar del Plata':'Penarol Mar del Plata','Gimnasia Comodoro':'Gimnasia Comodoro','LA Clippers':'Los Angeles Clippers'}

COUNTRY={'Spain':'ESP','United States':'USA','Serbia':'SRB','France':'FRA','Lithuania':'LTU','Argentina':'ARG','Greece':'GRE','Croatia':'CRO','Turkey':'TUR','Slovenia':'SLO','Germany':'GER','Italy':'ITA','Israel':'ISR','Montenegro':'MNE','Bosnia and Herzegovina':'BIH','Austria':'AUT','Romania':'ROU','Canada':'CAN','Brazil':'BRA','Uruguay':'URU','Finland':'FIN','Poland':'POL','Ukraine':'UKR','Georgia':'GEO','Latvia':'LAT','Estonia':'EST','Belgium':'BEL','Netherlands':'NED','United Kingdom':'GBR','Senegal':'SEN','Nigeria':'NGA','Cameroon':'CMR','Angola':'ANG','Australia':'AUS','New Zealand':'NZL','Dominican Republic':'DOM','Puerto Rico':'PUR','Bahamas':'BAH','Hungary':'HUN','North Macedonia':'MKD','Bulgaria':'BUL','Czech Republic':'CZE','Slovakia':'SVK','Sweden':'SWE','Denmark':'DEN','Iceland':'ISL','Portugal':'POR'}

STAR_OVR={
'Edy Tavares':90,'Facundo Campazzo':89,'Facu Campazzo':89,'Mike James':89,'Sasha Vezenkov':89,'Kendrick Nunn':88,'Kevin Punter':86,'Markus Howard':86,'TJ Shorts':87,'T.J. Shorts':87,'Shane Larkin':87,'Cedi Osman':86,'Juancho Hernangomez':86,'Nigel Hayes-Davis':86,'Walter Tavares':90,'Nikola Mirotic':86,'Theo Maledon':86,'Dario Saric':85,'Dario Šarić':85,'Codi Miller-McIntyre':84,'Sylvain Francisco':85,'Saben Lee':83,'Ricky Rubio':83,'Usman Garuba':82,'Mario Hezonja':86,'Gabriel Deck':85,'Chima Moneke':84,'Tadas Sedekerskis':82,'Chris Duarte':82,'Kameron Taylor':82,'Josh Nebo':82,'Brancou Badio':81,'Nicolas Brussino':82,'Vlatko Cancar':82,'Vlatko Čančar':82
}

LEAGUE_BASE={'NBA':84,'Liga ACB':74,'Primera FEB':66,'LNB Élite':71,'LBA Serie A':71,'easyCredit BBL':70,'Basketbol Süper Ligi':72,'Greek Basket League':71,'ABA League':69,'LKL':68,'Israeli Premier League':69,'Liga Nacional Argentina':65}

def norm(s):
 s=unicodedata.normalize('NFKD',str(s or '')).encode('ascii','ignore').decode().lower()
 return re.sub(r'[^a-z0-9]+',' ',s).strip()

def get(url,params=None):
 for attempt in range(6):
  r=S.get(url,params=params,timeout=25)
  if r.status_code==200:return r.json()
  if r.status_code==429:time.sleep(3+attempt*2);continue
  time.sleep(1.2)
 raise RuntimeError(f'HTTP {r.status_code}: {r.url}')

def parse_clubs():
 out=[]
 for line in DATA.read_text(encoding='utf-8').splitlines():
  if 'makeClub(' not in line:continue
  m=re.search(r"makeClub\((\d+),'([^']+)'",line);lm=re.search(r"leagueName:'([^']+)'",line);br=re.search(r"baseRating:(\d+(?:\.\d+)?)",line)
  if m and lm:out.append({'id':int(m.group(1)),'name':m.group(2),'league':lm.group(1),'baseRating':float(br.group(1)) if br else None})
 return out

def team_search(name):
 q=ALIASES.get(name,name)
 data=get(BASE+'/searchteams.php',{'t':q})
 teams=[x for x in (data.get('teams') or []) if x.get('strSport')=='Basketball']
 if not teams:return None
 target=norm(q)
 teams.sort(key=lambda x:(target in norm(x.get('strTeam')) or norm(x.get('strTeam')) in target, -abs(len(norm(x.get('strTeam')))-len(target))),reverse=True)
 return teams[0]

def position(raw):
 s=norm(raw).upper()
 if 'POINT' in s or s=='PG':return 'PG'
 if 'SHOOT' in s or s=='SG':return 'SG'
 if 'SMALL' in s or s=='SF':return 'SF'
 if 'POWER' in s or s=='PF':return 'PF'
 if 'CENTER' in s or 'CENTRE' in s or s=='C':return 'C'
 if 'GUARD' in s:return 'SG'
 if 'FORWARD' in s:return 'SF'
 return 'SF'

def age_from_birth(date):
 if not date:return None
 m=re.match(r'(\d{4})-',str(date));return 2026-int(m.group(1)) if m else None

def height_cm(raw):
 if not raw:return None
 m=re.search(r'(\d+(?:\.\d+)?)\s*m',str(raw).lower())
 if m:return round(float(m.group(1))*100)
 m=re.search(r'(\d+)\s*cm',str(raw).lower())
 return int(m.group(1)) if m else None

def calibrate(rows,club):
 base=LEAGUE_BASE.get(club['league'],69)
 if club['baseRating'] is not None:base=(base+club['baseRating'])/2
 # Deterministic team hierarchy; explicit star overrides take priority.
 spread=[5,4,3,2,2,1,1,0,0,-1,-1,-2,-2,-3,-3,-4,-4,-5,-5,-6]
 rows=sorted(rows,key=lambda x:(STAR_OVR.get(x['name'],0),-(x.get('age') or 27)),reverse=True)
 for i,r in enumerate(rows):
  target=STAR_OVR.get(r['name'])
  if target is None:target=round(max(58,min(88,base+spread[min(i,len(spread)-1)])))
  r['ovr']=target
  age=r.get('age') or 27
  r['potential']=max(target,min(94,target+(8 if age<=20 else 5 if age<=22 else 3 if age<=24 else 1 if age<=26 else 0)))
 return rows

def main():
 clubs=parse_clubs();generated={};report={'snapshot':'2026-09-02','source':'TheSportsDB API + manual RealGM validation','clubs_total':len(clubs),'clubs':{},'missing':[]}
 total_players=0
 for idx,c in enumerate(clubs):
  try:
   team=team_search(c['name'])
   if not team:raise RuntimeError('team not found')
   time.sleep(2.05)
   data=get(BASE+'/lookup_all_players.php',{'id':team['idTeam']})
   players=[];seen=set()
   for p in data.get('player') or []:
    name=(p.get('strPlayer') or '').strip()
    if not name or name in seen:continue
    seen.add(name)
    row={'name':name,'position':position(p.get('strPosition'))}
    a=age_from_birth(p.get('dateBorn'));h=height_cm(p.get('strHeight'));n=COUNTRY.get(p.get('strNationality') or '')
    if a and 15<=a<=50:row['age']=a
    if h and 160<=h<=235:row['height']=h
    if n:row['nationality']=n
    players.append(row)
   if len(players)<8:raise RuntimeError(f'only {len(players)} players')
   players=calibrate(players,c);generated[str(c['id'])]=players;total_players+=len(players)
   report['clubs'][str(c['id'])]={'name':c['name'],'league':c['league'],'source_team':team.get('strTeam'),'team_id':team.get('idTeam'),'players':len(players)}
   print(f"OK {c['id']:3d} {c['name']}: {len(players)}",flush=True)
  except Exception as e:
   report['missing'].append({'id':c['id'],'name':c['name'],'league':c['league'],'error':str(e)})
   print(f"MISS {c['id']:3d} {c['name']}: {e}",flush=True)
  time.sleep(2.05)
 meta={'snapshot':'2026-09-02','source':'TheSportsDB API + RealGM validation','clubs':len(generated),'players':total_players,'coveragePct':round(100*len(generated)/max(1,len(clubs)),1)}
 report.update({'clubs_complete':len(generated),'players_total':total_players,'coverage_pct':meta['coveragePct']})
 OUT.write_text("(function(g){'use strict';g.BBGM_REAL_ROSTERS_202627="+json.dumps(generated,ensure_ascii=False,separators=(',',':'))+';g.BBGM_REAL_ROSTERS_META_202627='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+";})(typeof globalThis!=='undefined'?globalThis:this);\n",encoding='utf-8')
 REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(meta,ensure_ascii=False),flush=True)
 if len(generated)<100:raise SystemExit('Coverage below 100 clubs; do not publish automatically')

if __name__=='__main__':main()
