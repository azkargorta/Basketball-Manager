#!/usr/bin/env python3
"""Build the private 2026/27 real-name roster pack used by Basketball Manager.

Facts (player name / listed position / listed team / age when available) are collected
from public RealGM league player tables. Game ratings, salaries, contracts, morale,
potential and personalities remain original Basketball Manager simulation data.

The script intentionally performs one request per league rather than one per team.
"""
from __future__ import annotations
import json, re, time
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "js" / "real_rosters_2026_27.js"
REPORT = ROOT / "REAL_ROSTERS_REPORT.md"
SNAPSHOT = "2026-09-02"

SOURCES = [
    ("Spanish ACB", "https://basketball.realgm.com/international/league/4/Spanish-ACB/players"),
    ("Spanish Primera FEB", "https://basketball.realgm.com/international/league/55/Spanish-Primera-FEB/players"),
    ("French LNB", "https://basketball.realgm.com/international/league/12/French-Jeep-Elite/players"),
    ("Italian LBA", "https://basketball.realgm.com/international/league/6/Italian-Lega-Basket-Serie-A/players"),
    ("German BBL", "https://basketball.realgm.com/international/league/15/German-BBL/players"),
    ("Turkish BSL", "https://basketball.realgm.com/international/league/7/Turkish-BSL/players"),
    ("Greek A1", "https://basketball.realgm.com/international/league/8/Greek-HEBA-A1/players"),
    ("ABA League", "https://basketball.realgm.com/international/league/18/Adriatic-League-Liga-ABA/players"),
    ("Lithuanian LKL", "https://basketball.realgm.com/international/league/10/Lithuanian-LKL/players"),
    ("Israeli BSL", "https://basketball.realgm.com/international/league/11/Israeli-BSL/players"),
    ("Argentinian Liga A", "https://basketball.realgm.com/international/league/58/Argentinian-Liga-A/players"),
    ("NBA", "https://basketball.realgm.com/nba/players"),
]

# Club id -> public source aliases. First alias is the preferred label for reports.
ALIASES = {
1:["Baskonia"],2:["Real Madrid"],3:["Barca","Barcelona"],4:["Valencia Basket"],5:["Unicaja"],6:["Joventut Badalona"],7:["Dreamland Gran Canaria","Gran Canaria"],8:["UCAM Murcia CB","UCAM Murcia"],
9:["Olympiacos"],10:["Panathinaikos"],11:["Fenerbahce","Fenerbahce Ulker","Fenerbahce Beko"],12:["AS Monaco Basket","AS Monaco"],
13:["Casademont Zaragoza"],14:["CB Girona","Basquet Girona"],15:["Forca Lleida CE","Lleida"],16:["BAXI Manresa","Manresa"],17:["Lenovo Tenerife","La Laguna Tenerife","Tenerife"],18:["CB Coruna","Leyma Coruna"],19:["Monbus Obradoiro","Obradoiro"],20:["MoraBanc Andorra"],21:["Siblo San Pablo Burgos","San Pablo Burgos"],22:["Rio Breogan","Breogan"],23:["Bilbao Basket","Surne Bilbao"],
24:["Dubai","Dubai Basketball"],25:["Anadolu Efes"],26:["Hapoel Shlomo Tel Aviv","Hapoel Tel Aviv"],27:["KK Partizan","Partizan"],28:["AX Armani Exchange Milan","Olimpia Milano","EA7 Emporio Armani Milan"],29:["ASVEL Basket","ASVEL Villeurbanne"],30:["Maccabi FOX Tel Aviv","Maccabi Tel Aviv"],31:["KK Crvena Zvezda","Crvena Zvezda"],32:["Besiktas Icrypex","Besiktas"],33:["Zalgiris","Zalgiris Kaunas"],34:["Paris Basketball"],35:["Bayern Munich"],36:["Virtus Bologna"],
37:["Movistar Estudiantes"],38:["Baloncesto Fuenlabrada","Flexicar Fuenlabrada","Fuenlabrada"],39:["Palencia Baloncesto"],40:["HLA Alicante"],41:["Real Valladolid Baloncesto","Real Valladolid"],42:["Gipuzkoa Basket"],43:["Club Ourense Baloncesto"],44:["Grupo Ureta Tizona Burgos","Tizona Burgos"],
45:["JL Bourg-en-Bresse","JL Bourg"],46:["Nanterre 92"],47:["Le Mans Sarthe Basket"],48:["Cholet Basket"],49:["Strasbourg IG","SIG Strasbourg"],50:["CSP Limoges","Limoges CSP"],51:["JDA Dijon Basket","JDA Dijon"],52:["Le Portel"],
53:["Germani Brescia"],54:["Umana Venezia","Reyer Venezia"],55:["Dolomiti Energia Trento"],56:["Bertram Tortona","Derthona Basket"],57:["Grissin Bon Reggio Emilia","Pallacanestro Reggiana"],58:["Pallacanestro Trieste 2004","Pallacanestro Trieste"],59:["Banco di Sardegna Sassari","Dinamo Sassari"],60:["OpenJobMetis Varese","Pallacanestro Varese"],
61:["ALBA Berlin"],62:["ratiopharm Ulm","Ratiopharm Ulm"],63:["Wurzburg Baskets","Würzburg Baskets"],64:["MHP RIESEN Ludwigsburg"],65:["Telekom Baskets Bonn"],66:["BV Chemnitz 99","NINERS Chemnitz"],67:["EWE Baskets Oldenburg"],68:["Towers Hamburg","Veolia Towers Hamburg"],69:["Basketball Lowen Braunschweig","Basketball Löwen Braunschweig"],70:["Rostock Seawolves","ROSTOCK SEAWOLVES"],
71:["Galatasaray"],72:["Turk Telekom","Türk Telekom"],73:["Bahcesehir Koleji","Bahçeşehir Koleji"],74:["Tofas SC","TOFAS Bursa","TOFAŞ Bursa"],75:["Bursaspor"],76:["Mersin SK","Mersin Buyuksehir Belediyesi"],77:["Socar Petkimspor","Petkim Spor"],78:["Darussafaka","Darüşşafaka"],
79:["AEK Athens"],80:["Aris Midea Thessaloniki","Aris Thessaloniki"],81:["PAOK BC","PAOK Thessaloniki"],82:["ASP Promitheas Patras","Promitheas Patras"],83:["Peristeri Betsson","Peristeri"],84:["Panionios"],
85:["Buducnost Voli Podgorica","Buducnost VOLI","Budućnost VOLI"],86:["Cedevita Olimpija"],87:["KK Cibona","Cibona"],88:["FMP Beograd"],89:["BC Igokea","Igokea"],90:["Krka","Krka Novo Mesto"],91:["KK Bosna","Bosna Sarajevo"],92:["Mega Basket"],93:["Studentski Centar Podgorica","SC Derby"],94:["Spartak Subotica"],95:["U-Banca Transilvania Cluj Napoca","U-BT Cluj-Napoca"],96:["Zadar"],
97:["Rytas Vilnius","Lietuvos Rytas"],98:["7Bet-Lietkabelis Panevezys","Lietkabelis"],99:["Neptunas","Neptūnas Klaipėda"],100:["Juventus Utena"],101:["Siauliai","Šiauliai"],
102:["Hapoel Jerusalem"],103:["Bnei Herzliya"],104:["Hapoel Unet Holon","Hapoel Holon"],105:["Hapoel Beer Sheva","Hapoel Be’er Sheva"],
106:["Borac Cacak","Borac Čačak"],107:["BC Siroki","HKK Siroki","HKK Široki"],108:["Slovan Bratislava"],109:["Ilirija","Perspektiva Ilirija"],110:["BC Hallmann Vienna","BC Vienna"],
111:["Instituto Atletico Central Cordoba","Instituto Cordoba","Instituto Córdoba"],112:["Boca Juniors"],113:["Quimsa"],114:["Ciclista Olimpico","Olimpico La Banda","Olímpico La Banda"],115:["San Lorenzo de Almagro","San Lorenzo"],116:["Obras Basket"],117:["Regatas Corrientes"],118:["Penarol","Peñarol"],119:["Ferro Carril Oeste"],120:["Gimnasia y Esgrima de Comodoro Rivadavia","Gimnasia Comodoro"],
121:["Atlanta Hawks"],122:["Boston Celtics"],123:["Brooklyn Nets"],124:["Charlotte Hornets"],125:["Chicago Bulls"],126:["Cleveland Cavaliers"],127:["Dallas Mavericks"],128:["Denver Nuggets"],129:["Detroit Pistons"],130:["Golden State Warriors"],131:["Houston Rockets"],132:["Indiana Pacers"],133:["Los Angeles Clippers","LA Clippers"],134:["Los Angeles Lakers"],135:["Memphis Grizzlies"],136:["Miami Heat"],137:["Milwaukee Bucks"],138:["Minnesota Timberwolves"],139:["New Orleans Pelicans"],140:["New York Knicks"],141:["Oklahoma City Thunder"],142:["Orlando Magic"],143:["Philadelphia 76ers"],144:["Phoenix Suns"],145:["Portland Trail Blazers"],146:["Sacramento Kings"],147:["San Antonio Spurs"],148:["Toronto Raptors"],149:["Utah Jazz"],150:["Washington Wizards"],
}

# Canonical game club names for the generated report.
GAME_NAMES = {i: a[0] for i,a in ALIASES.items()}


def norm(s: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

ALIAS_TO_ID = {}
for cid, aliases in ALIASES.items():
    for a in aliases:
        ALIAS_TO_ID[norm(a)] = cid


def fetch_players(label: str, url: str):
    headers = {"User-Agent":"BasketballManagerPrivateBeta/0.25 (+https://github.com/azkargorta/Basketball-Manager)"}
    r = requests.get(url, headers=headers, timeout=45)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    rows=[]
    for tr in soup.select("table tbody tr"):
        cells=[c.get_text(" ",strip=True) for c in tr.find_all(["td","th"])]
        if not cells: continue
        # International tables: Player, Pos, HT, WT, Team, Birth City, Draft Status, Nationality
        # NBA table: #, Player, Pos, HT, WT, Age, Current Team, ...
        if label=="NBA":
            if len(cells)<7: continue
            player, pos, age, team = cells[1], cells[2], cells[5], cells[6]
        else:
            if len(cells)<5: continue
            player, pos, team, age = cells[0], cells[1], cells[4], None
        cid=ALIAS_TO_ID.get(norm(team))
        if not cid: continue
        rows.append((cid,{"name":player,"pos":pos or "",**({"age":int(age)} if age and str(age).isdigit() else {})},team,label))
    return rows


def js_wrapper(pack, meta):
    data=json.dumps(pack,ensure_ascii=False,separators=(",",":"))
    metadata=json.dumps(meta,ensure_ascii=False,separators=(",",":"))
    return f"""/* AUTO-GENERATED by tools/build_real_rosters.py — snapshot {SNAPSHOT}.\n   Identity facts only. Ratings/contracts/potential/personality remain original game data. */\n(function(g){{\n'use strict';\nconst BBGM=g.BBGM=g.BBGM||{{}};\nconst ROSTERS={data};\nconst META={metadata};\nconst normPos=p=>String(p||'').toUpperCase().replace(/[^A-Z]/g,'');\nfunction posOptions(p){{const x=normPos(p);if(x==='PG')return['PG'];if(x==='SG')return['SG'];if(x==='SF')return['SF'];if(x==='PF')return['PF'];if(x==='C')return['C'];if(x==='G')return['PG','SG'];if(x==='GF'||x==='FG')return['SG','SF'];if(x==='F')return['SF','PF'];if(x==='FC'||x==='CF')return['PF','C'];return[]}}\nfunction splitName(full){{const bits=String(full||'').trim().split(/\\s+/);if(bits.length<2)return{{firstName:bits[0]||'',lastName:''}};return{{firstName:bits.slice(0,-1).join(' '),lastName:bits.at(-1)}}}}\nfunction scoreSlot(slot,e){{const opts=posOptions(e.pos),p=slot.primaryPosition,s=slot.secondaryPosition;let score=0;if(opts.includes(p))score+=100;if(s&&opts.includes(s))score+=45;if(!opts.length)score+=10;score+=Math.max(0,30-Math.abs((slot.age||27)-(e.age||slot.age||27)));return score}}\nfunction applyClub(c,entries){{if(!c||!Array.isArray(c.roster)||!entries?.length)return 0;const free=c.roster.slice(),used=new Set();let n=0;for(const e of entries){{let best=null,bestScore=-1;for(const p of free){{if(used.has(p.id))continue;const sc=scoreSlot(p,e);if(sc>bestScore){{best=p;bestScore=sc}}}}if(!best)break;used.add(best.id);const nm=splitName(e.name);best.firstName=nm.firstName;best.lastName=nm.lastName;if(e.age)best.age=e.age;const opts=posOptions(e.pos);if(opts.length&&bestScore<90){{best.primaryPosition=opts[0];best.secondaryPosition=opts[1]||best.secondaryPosition||null}}best.realIdentityV25=true;best.realSourcePositionV25=e.pos||'';best.realRosterSnapshotV25=META.snapshot;n++}}c.realRosterV25={{snapshot:META.snapshot,realPlayers:n,sourceRows:entries.length}};return n}}\nBBGM.realRostersV25=ROSTERS;BBGM.realRosterMetaV25=META;\nBBGM.applyRealRosterPackV25=function(target){{const world=target?.world||target;if(!world?.clubs)return false;let changed=false,total=0;for(const c of world.clubs){{const entries=ROSTERS[String(c.id)]||ROSTERS[c.id];if(!entries?.length)continue;const already=c.roster?.filter(p=>p.realRosterSnapshotV25===META.snapshot).length||0;if(already>=Math.min(entries.length,c.roster?.length||0))continue;const n=applyClub(c,entries);if(n){{changed=true;total+=n}}}}world.realRosterPack={{id:'real_private_2026_27',snapshot:META.snapshot,source:META.source,playersApplied:total,coverage:META.coverage}};return changed}};\nconst original=BBGM.createWorld;if(typeof original==='function'&&!BBGM._realRosterWrappedV25){{BBGM._realRosterWrappedV25=true;BBGM.createWorld=function(...args){{const w=original.apply(this,args);BBGM.applyRealRosterPackV25(w);return w}}}}\n}})(typeof globalThis!=='undefined'?globalThis:this);\n"""


def main():
    grouped={str(i):[] for i in range(1,151)}
    raw_teams={}
    errors=[]
    for label,url in SOURCES:
        try:
            rows=fetch_players(label,url)
            for cid,p,team,src in rows:
                # Prevent duplicates when the same club appears in more than one source accidentally.
                key=(norm(p['name']),norm(p.get('pos','')))
                seen={(norm(x['name']),norm(x.get('pos',''))) for x in grouped[str(cid)]}
                if key not in seen: grouped[str(cid)].append(p)
                raw_teams.setdefault(cid,set()).add(team)
            print(label,len(rows))
        except Exception as e:
            errors.append(f"{label}: {e}")
            print("ERROR",label,e)
        time.sleep(.7)
    # Remove empty arrays from payload but keep them in report.
    payload={k:v for k,v in grouped.items() if v}
    covered=sum(bool(v) for v in grouped.values())
    players=sum(len(v) for v in grouped.values())
    meta={"snapshot":SNAPSHOT,"source":"RealGM public 2026/27 player tables","coverage":{"clubs":covered,"totalClubs":150,"players":players},"sourceUrls":[u for _,u in SOURCES]}
    OUT.write_text(js_wrapper(payload,meta),encoding="utf-8")
    lines=["# Real roster snapshot — v0.25","",f"Snapshot: **{SNAPSHOT}**",f"Clubs with at least one matched current player: **{covered}/150**",f"Matched player rows: **{players}**","","The pack changes identity facts only. Ratings, potential, salaries, contracts, morale and personalities are Basketball Manager simulation values.","","## Coverage by club",""]
    for cid in range(1,151):
        n=len(grouped[str(cid)]);source=", ".join(sorted(raw_teams.get(cid,set()))) or "—"
        lines.append(f"- {cid:03d} · {GAME_NAMES.get(cid,str(cid))}: **{n}** · {source}")
    if errors:
        lines += ["","## Source errors",""]+[f"- {x}" for x in errors]
    REPORT.write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(f"Generated {OUT}: {players} players across {covered} clubs")

if __name__=="__main__": main()
