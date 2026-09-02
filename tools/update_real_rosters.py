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

SOURCES = {
    'Liga ACB': ('international', 'https://basketball.realgm.com/international/league/4/Spanish-ACB/teams'),
    'Primera FEB': ('international', 'https://basketball.realgm.com/international/league/55/Spanish-LEB-Gold/teams'),
    'LNB Élite': ('international', 'https://basketball.realgm.com/international/league/12/French-Jeep-Elite/teams'),
    'LBA Serie A': ('international', 'https://basketball.realgm.com/international/league/6/Italian-Lega-Basket-Serie-A/teams'),
    'easyCredit BBL': ('international', 'https://basketball.realgm.com/international/league/15/German-BBL/teams'),
    'Basketbol Süper Ligi': ('international', 'https://basketball.realgm.com/international/league/7/Turkish-BSL/teams'),
    'Greek Basket League': ('international', 'https://basketball.realgm.com/international/league/8/Greek-HEBA-A1/teams'),
    'ABA League': ('international', 'https://basketball.realgm.com/international/league/18/Adriatic-League-Liga-ABA/teams'),
    'LKL': ('international', 'https://basketball.realgm.com/international/league/10/Lithuanian-LKL/teams'),
    'Israeli Premier League': ('international', 'https://basketball.realgm.com/international/league/11/Israeli-BSL/teams'),
    'Liga Nacional Argentina': ('international', 'https://basketball.realgm.com/international/league/58/Argentinian-Liga-A/teams'),
    'NBA': ('nba', 'https://basketball.realgm.com/nba/teams'),
}

ALIASES = {
    'Asisa Joventut': 'Joventut Badalona',
    'Kids&Us Manresa': 'BAXI Manresa',
    'FIATC Girona': 'CB Girona',
    'iLERNA Lleida': 'Forca Lleida CE',
    'La Laguna Tenerife': 'Lenovo Tenerife',
    'Leyma Coruña': 'CB Coruna',
    'San Pablo Burgos': 'Siblo San Pablo Burgos',
    'Río Breogán': 'Rio Breogan',
    'Surne Bilbao': 'Bilbao Basket',
    'Fenerbahçe': 'Fenerbahce Beko',
    'AS Monaco': 'Monaco',
    'Dubai Basketball': 'Dubai',
    'Hapoel Tel Aviv': 'Hapoel Tel Aviv',
    'Partizán Belgrado': 'KK Partizan',
    'Olimpia Milano': 'AX Armani Exchange Milan',
    'ASVEL Villeurbanne': 'ASVEL Basket',
    'Maccabi Tel Aviv': 'Maccabi FOX Tel Aviv',
    'Estrella Roja': 'KK Crvena Zvezda',
    'Besiktas': 'Besiktas Icrypex',
    'Zalgiris Kaunas': 'Zalgiris',
    'Bayern Múnich': 'Bayern Munich',
    'Virtus Bolonia': 'Virtus Bologna',
    'Flexicar Fuenlabrada': 'Baloncesto Fuenlabrada',
    'Palencia Baloncesto': 'Zunder Palencia',
    'HLA Alicante': 'Lucentum Alicante',
    'Real Valladolid': 'Valladolid',
    'Club Ourense Baloncesto': 'Ourense Baloncesto',
    'Tizona Burgos': 'CB Tizona',
    'JL Bourg': 'JL Bourg-en-Bresse',
    'SIG Strasbourg': 'Strasbourg IG',
    'Limoges CSP': 'CSP Limoges',
    'JDA Dijon': 'JDA Dijon Basket',
    'Reyer Venezia': 'Umana Venezia',
    'Derthona Basket': 'Bertram Tortona',
    'Pallacanestro Reggiana': 'Grissin Bon Reggio Emilia',
    'Pallacanestro Trieste': 'Pallacanestro Trieste 2004',
    'Dinamo Sassari': 'Banco di Sardegna Sassari',
    'Pallacanestro Varese': 'OpenJobMetis Varese',
    'ratiopharm Ulm': 'Ratiopharm Ulm',
    'Würzburg Baskets': 's.Oliver Baskets',
    'MHP RIESEN Ludwigsburg': 'MHP Riesen',
    'NINERS Chemnitz': 'BV Chemnitz 99',
    'Basketball Löwen Braunschweig': 'Basketball Lowen Braunschweig',
    'ROSTOCK SEAWOLVES': 'Rostock Seawolves',
    'Türk Telekom': 'Turk Telekom',
    'Bahçeşehir Koleji': 'Bahcesehir Koleji',
    'TOFAŞ Bursa': 'Tofas SC',
    'Mersin SK': 'Mersin BSB',
    'Petkim Spor': 'Socar Petkimspor',
    'Darüşşafaka': 'Darussafaka',
    'Aris Thessaloniki': 'Aris Midea Thessaloniki',
    'PAOK Thessaloniki': 'PAOK BC',
    'Promitheas Patras': 'ASP Promitheas Patras',
    'Peristeri': 'Peristeri Betsson',
    'Budućnost VOLI': 'KK Buducnost',
    'Cibona': 'KK Cibona',
    'Igokea': 'BC Igokea',
    'Krka Novo Mesto': 'Krka Novo Mesto',
    'U-BT Cluj-Napoca': 'U-Banca Transilvania Cluj Napoca',
    'Zadar': 'KK Zadar',
    'Borac Čačak': 'Borac Cacak',
    'HKK Široki': 'Siroki',
    'Perspektiva Ilirija': 'Ilirija',
    'Rytas Vilnius': 'Rytas Vilnius',
    'Lietkabelis': '7Bet-Lietkabelis Panevezys',
    'Neptūnas Klaipėda': 'Neptunas',
    'Šiauliai': 'Siauliai',
    'Hapoel Holon': 'Hapoel Unet Holon',
    'Hapoel Be’er Sheva': 'Hapoel Beer Sheva',
    'Instituto Córdoba': 'Instituto Atletico Central Cordoba',
    'Olímpico La Banda': 'Ciclista Olimpico',
    'San Lorenzo': 'San Lorenzo de Almagro',
    'Obras Basket': 'Obras Sanitarias',
    'Peñarol Mar del Plata': 'Penarol Mar del Plata',
    'Gimnasia Comodoro': 'Gimnasia y Esgrima de Comodoro Rivadavia',
}

COUNTRY_CODES = {
    'spain':'ESP','united states':'USA','usa':'USA','serbia':'SRB','france':'FRA','lithuania':'LTU','argentina':'ARG',
    'greece':'GRE','croatia':'CRO','turkey':'TUR','turkiye':'TUR','slovenia':'SLO','germany':'GER','italy':'ITA','israel':'ISR',
    'montenegro':'MNE','bosnia and herzegovina':'BIH','austria':'AUT','romania':'ROU','canada':'CAN','brazil':'BRA','uruguay':'URU',
    'finland':'FIN','poland':'POL','ukraine':'UKR','georgia':'GEO','latvia':'LAT','estonia':'EST','belgium':'BEL','netherlands':'NED',
    'england':'GBR','united kingdom':'GBR','senegal':'SEN','nigeria':'NGA','cameroon':'CMR','angola':'ANG','australia':'AUS','new zealand':'NZL',
    'dominican republic':'DOM','puerto rico':'PUR','bahamas':'BAH','cuba':'CUB','hungary':'HUN','north macedonia':'MKD','macedonia':'MKD',
    'czech republic':'CZE','czechia':'CZE','slovakia':'SVK','sweden':'SWE','denmark':'DEN','iceland':'ISL','portugal':'POR','albania':'ALB',
    'kosovo':'KOS','bulgaria':'BUL','russia':'RUS','belarus':'BLR','ivory coast':'CIV','cote d\'ivoire':'CIV','democratic republic of the congo':'COD',
    'republic of the congo':'COG','mali':'MLI','mexico':'MEX','japan':'JPN','china':'CHN','south sudan':'SSD','cape verde':'CPV','switzerland':'SUI'
}

SESSION = requests.Session()
SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/139 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.8',
})

def norm(s: str) -> str:
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\b(basketball|basket|club|bc|cb|kk|sk|baloncesto|pallacanestro)\b', ' ', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

def sim(a: str, b: str) -> float:
    aa, bb = norm(a), norm(b)
    if not aa or not bb:
        return 0.0
    if aa in bb or bb in aa:
        return 0.92
    return SequenceMatcher(None, aa, bb).ratio()

def get(url: str, tries: int = 4) -> str:
    err = None
    for i in range(tries):
        try:
            r = SESSION.get(url, timeout=30)
            if r.status_code == 200 and len(r.text) > 500:
                return r.text
            err = RuntimeError(f'{r.status_code} {url}')
        except Exception as e:
            err = e
        time.sleep(1.0 + i * 1.5)
    raise RuntimeError(f'Fetch failed: {url}: {err}')

def parse_clubs() -> list[dict]:
    clubs = []
    for line in DATA_JS.read_text(encoding='utf-8').splitlines():
        if 'makeClub(' not in line:
            continue
        m = re.search(r"makeClub\((\d+),'([^']+)'", line)
        lm = re.search(r"leagueName:'([^']+)'", line)
        if m and lm:
            clubs.append({'id': int(m.group(1)), 'name': m.group(2), 'league': lm.group(1)})
    return clubs

def discover_roster_links(teams_url: str) -> dict[str, str]:
    soup = BeautifulSoup(get(teams_url), 'lxml')
    out = {}
    for tr in soup.select('tr'):
        tds = tr.find_all('td')
        if not tds:
            continue
        team = tds[0].get_text(' ', strip=True)
        roster = None
        for a in tr.find_all('a', href=True):
            href = a['href']
            if '/rosters' in href or a.get_text(' ', strip=True).lower() in {'roster','rosters'}:
                roster = urljoin(BASE, href)
                break
        if team and roster:
            out[team] = roster
    return out

def search_roster_url(team_name: str) -> str | None:
    try:
        soup = BeautifulSoup(get(f'{BASE}/search?q={quote_plus(team_name)}', tries=2), 'lxml')
    except Exception:
        return None
    candidates = []
    for a in soup.find_all('a', href=True):
        if '/team/' in a['href']:
            candidates.append((sim(team_name, a.get_text(' ', strip=True)), a['href']))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    score, href = candidates[0]
    if score < 0.45:
        return None
    href = href.split('?')[0].rstrip('/')
    if not href.endswith('/rosters'):
        href += '/rosters'
    return urljoin(BASE, href)

def flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [' '.join(str(x) for x in tup if str(x) != 'nan').strip() for tup in df.columns]
    else:
        df.columns = [str(x).strip() for x in df.columns]
    return df

def choose_roster_table(html: str) -> pd.DataFrame:
    best, best_score = None, -1
    for df in pd.read_html(StringIO(html)):
        df = flatten_columns(df)
        cols = [norm(c) for c in df.columns]
        score = int(any(c == 'player' or c.endswith(' player') for c in cols)) * 5
        score += int(any(c in {'pos','position'} or c.endswith(' pos') for c in cols)) * 2
        score += min(len(df), 30) / 30
        if score > best_score:
            best, best_score = df, score
    if best is None or best_score < 5:
        raise RuntimeError('No roster table found')
    return best

def col(df: pd.DataFrame, *names: str) -> str | None:
    wanted = {norm(x) for x in names}
    for c in df.columns:
        nc = norm(c)
        if nc in wanted or any(nc.endswith(' ' + x) for x in wanted):
            return c
    return None

def position(raw: str) -> str:
    p = re.sub(r'[^A-Z]', '', str(raw or '').upper())
    if p in {'PG','SG','SF','PF','C'}:
        return p
    if p in {'G','PGSG','SGPG'}:
        return 'PG'
    if p in {'GF','SGSF','SFSG'}:
        return 'SG'
    if p in {'F','SFPF','PFSF'}:
        return 'SF'
    if p in {'FC','PFC','CPF'}:
        return 'PF'
    return 'SF'

def height_cm(raw) -> int | None:
    s = str(raw or '').strip()
    m = re.search(r"(\d+)\s*[-']\s*(\d+)", s)
    if m:
        return round((int(m.group(1)) * 12 + int(m.group(2))) * 2.54)
    try:
        v = float(s)
        return round(v) if 150 <= v <= 240 else None
    except Exception:
        return None

def age_value(raw) -> int | None:
    try:
        v = int(float(str(raw).strip()))
        return v if 15 <= v <= 50 else None
    except Exception:
        return None

def nationality(raw) -> str | None:
    s = str(raw or '').replace('\xa0', ' ').strip()
    if not s or s.lower() == 'nan':
        return None
    first = re.split(r'\n|/|,', s)[0].strip().lower()
    return COUNTRY_CODES.get(first, first[:3].upper() if first else None)

def parse_roster(url: str) -> list[dict]:
    df = choose_roster_table(get(url))
    pc, poc = col(df, 'Player'), col(df, 'Pos', 'Position')
    hc, ac, nc = col(df, 'Height', 'HT'), col(df, 'Age'), col(df, 'Nationality')
    if not pc:
        raise RuntimeError('Player column missing')
    rows, seen = [], set()
    for _, r in df.iterrows():
        name = str(r.get(pc, '')).strip()
        if not name or name.lower() == 'nan' or name.lower() == 'player' or name in seen:
            continue
        seen.add(name)
        item = {'name': name, 'position': position(r.get(poc, '')) if poc else 'SF'}
        h = height_cm(r.get(hc)) if hc else None
        a = age_value(r.get(ac)) if ac else None
        n = nationality(r.get(nc)) if nc else None
        if h: item['height'] = h
        if a: item['age'] = a
        if n: item['nationality'] = n
        rows.append(item)
    return rows

def best_match(app_name: str, candidates: dict[str, str]):
    target = ALIASES.get(app_name, app_name)
    if not candidates:
        return None, None, 0.0
    ranked = sorted(((sim(target, n), n, u) for n, u in candidates.items()), reverse=True)
    score, name, url = ranked[0]
    return name, url, score

def main():
    clubs = parse_clubs()
    generated = {}
    report = {'snapshot':'2026-09-02','clubs_total':len(clubs),'clubs':{},'missing':[],'sources':{}}
    source_links = {}
    for league, (_, url) in SOURCES.items():
        try:
            links = discover_roster_links(url)
            source_links[league] = links
            report['sources'][league] = {'url': url, 'teams_found': len(links)}
            print(f'{league}: {len(links)} teams found')
        except Exception as e:
            source_links[league] = {}
            report['sources'][league] = {'url': url, 'error': str(e)}
            print(f'{league}: ERROR {e}')

    for i, club in enumerate(clubs, 1):
        links = source_links.get(club['league'], {})
        matched_name, roster_url, score = best_match(club['name'], links)
        used_search = False
        if not roster_url or score < 0.48:
            roster_url = search_roster_url(ALIASES.get(club['name'], club['name']))
            used_search = bool(roster_url)
            if used_search:
                matched_name, score = 'search fallback', max(score, 0.48)
        if not roster_url:
            report['missing'].append({'id':club['id'],'name':club['name'],'league':club['league'],'reason':'no roster url','best':matched_name,'score':score})
            continue
        try:
            roster = parse_roster(roster_url)
            if len(roster) < 8:
                raise RuntimeError(f'only {len(roster)} players')
            generated[str(club['id'])] = roster
            report['clubs'][str(club['id'])] = {'name':club['name'],'league':club['league'],'source_team':matched_name,'match_score':round(score,3),'roster_url':roster_url,'players':len(roster),'search_fallback':used_search}
            print(f"[{i}/{len(clubs)}] {club['id']:3d} {club['name']}: {len(roster)} players <- {matched_name}")
        except Exception as e:
            report['missing'].append({'id':club['id'],'name':club['name'],'league':club['league'],'reason':str(e),'url':roster_url,'best':matched_name,'score':score})
            print(f"[{i}/{len(clubs)}] MISS {club['id']} {club['name']}: {e}")
        time.sleep(0.12)

    report['clubs_complete'] = len(generated)
    report['players_total'] = sum(len(v) for v in generated.values())
    report['coverage_pct'] = round(100 * len(generated) / max(1, len(clubs)), 1)
    meta = {'snapshot':'2026-09-02','source':'RealGM public roster pages','clubs':len(generated),'players':report['players_total'],'coveragePct':report['coverage_pct']}
    js = "(function(g){\n'use strict';\n" + 'g.BBGM_REAL_ROSTERS_202627=' + json.dumps(generated, ensure_ascii=False, separators=(',',':')) + ';\n' + 'g.BBGM_REAL_ROSTERS_META_202627=' + json.dumps(meta, ensure_ascii=False, separators=(',',':')) + ";\n})(typeof globalThis!=='undefined'?globalThis:this);\n"
    OUT_JS.write_text(js, encoding='utf-8')
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'clubs':len(generated),'players':report['players_total'],'coverage_pct':report['coverage_pct'],'missing':len(report['missing'])}))
    if len(generated) < 100:
        raise SystemExit('Coverage below 100 clubs; inspect REAL_ROSTERS_REPORT.json')

if __name__ == '__main__':
    main()
