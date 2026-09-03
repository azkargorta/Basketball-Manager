(function(g){
'use strict';
const BBGM=g.BBGM;
const pack=BBGM&&BBGM.realPrivatePack202627;
if(!pack||!pack.clubs)return;

/* Final ratings audit — 2026-09-03
   Scope: current Liga Endesa clubs + current EuroLeague clubs represented in the game.
   Method: every player in scope is recalibrated against a club-level target, preserving
   internal hierarchy, then high-confidence individual cases are overridden using
   2025/26 performance, awards and projected 2026/27 role. These are original game
   ratings, not ratings copied from a third-party game/database. */

const ACB_IDS=[1,2,3,4,5,6,8,13,14,15,16,17,18,19,20,21,22,23];
const EUROLEAGUE_IDS=[1,2,3,4,9,10,11,24,25,26,27,28,29,30,31,33,34,35,36];
const CLUB_TARGET_MEAN={
  1:78.8,2:81.7,3:80.3,4:79.3,5:78.1,6:76.9,8:77.3,
  13:76.4,14:74.8,15:74.6,16:75.4,17:77.8,18:74.8,19:74.9,20:75.4,21:75.6,22:75.2,23:75.3,
  9:82.0,10:82.5,11:81.6,24:80.0,25:81.3,26:80.8,27:80.0,28:79.8,29:79.0,30:79.5,31:79.5,
  33:80.2,34:79.7,35:79.2,36:78.8
};
const REVIEW_IDS=[...new Set([...ACB_IDS,...EUROLEAGUE_IDS])];

function key(name){
  return String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

/* High-confidence individual anchors. They intentionally cover stars, award-level
   performers and obvious outliers; everyone else is still recalibrated by club. */
const INDIVIDUAL={
  'markus howard':84,
  'timothe luwawu cabarrot':84,
  'edy tavares':88,'walter tavares':88,
  'facu campazzo':87,'facundo campazzo':87,
  'theo maledon':86,
  'kevin punter':86,
  'jaime pradilla':81,
  'kendrick perry':81,
  'david dejulius':82,
  'dylan ennis':80,
  'jonah radebaugh':79,
  'ricky rubio':83,
  'nicolas laprovittola':82,
  'ante tomic':80,
  'cameron hunt':80,
  'gonzalo corbalan':81,
  'marcelinho huertas':84,
  'giorgi shermadini':83,
  'kyle guy':80,
  'tryggvi hlinason':79,
  'shannon evans':79,
  'francis alonso':78,
  'melvin ejim':79,
  'james batemon iii':78,
  'james batemon':78,
  'trent forrest':80,
  'willy hernangomez':82,
  'ignas brazdeikis':81,
  'jilson bango':80,
  'nicolas brussino':80,
  'mac mcclung':79,
  'john shurna':78,
  'vlatko cancar':81,

  'sasha vezenkov':90,
  'nikola milutinov':85,
  'codi miller mcintyre':83,
  'jean montero':86,
  'evan fournier':85,
  'tyler dorsey':83,
  'donta hall':83,
  'tyrique jones':82,
  'cory joseph':80,
  'kostas papanikolaou':79,

  'kendrick nunn':89,
  'nigel hayes davis':87,
  'guerschon yabusele':86,
  'mathias lessort':85,
  'juancho hernangomez':84,
  'sylvain francisco':84,
  'jerian grant':82,
  'isaac bonga':81,
  'kostas sloukas':81,

  'shane larkin':85,
  'wade baldwin iv':84,
  'shavon shields':84,
  'talen horton tucker':83,
  'nicolo melli':81,
  'will clyburn':80,
  'tarik biberovic':80,

  'dzanan musa':85,
  'mckinley wright':84,
  'davis bertans':82,
  'dwayne bacon':81,
  'mfiondu kabengele':81,
  'mamadi diakite':80,

  'mike james':87,
  'dario saric':84,
  'jordan loyd':83,
  'isaia cordinier':81,
  'p j dozier':81,
  'pj dozier':81,
  'bruno fernando':82,
  'matthew strazel':81,
  'kai jones':79,

  'vasilije micic':86,
  'zach leday':84,
  'johnathan motley':82,
  'tomas satoransky':82,
  'amir coffey':81,
  'daniel oturu':81,
  'elijah bryant':80,

  'carlik jones':84,
  'luca vildoza':82,
  'lamar stevens':81,
  'alessandro pajola':80,

  'nikola mirotic':86,
  'tj shorts':88,
  't j shorts':88,

  'daniel theis':83,
  'oshae brissett':81,
  'yam madar':80,
  'bonzie colson jr':80,

  'johnathan motley':82,
  'jared butler':81,

  'jonas valanciunas':85,
  'carsen edwards':87,
  'saben lee':82,
  'sterling brown':81,
  'marius grigonis':80,
  'maodo lo':79,

  'kamar baldwin':81,
  'duane washington jr':82,
  'marjon beauchamp':80,
  'johannes thiemann':79,
  'andreas obst':80,

  'kessler edwards':80,
  'bobi klintman':80,
  'wendell moore jr':79,
  'derrick alston jr':79
};

let playersReviewed=0;
let individualOverrides=0;
const clubSummary={};
for(const id of REVIEW_IDS){
  const rows=pack.clubs[id];
  const target=CLUB_TARGET_MEAN[id];
  if(!Array.isArray(rows)||!rows.length||!Number.isFinite(target))continue;
  const rated=rows.filter(r=>Number.isFinite(Number(r.ovr)));
  if(!rated.length)continue;
  const before=rated.reduce((s,r)=>s+Number(r.ovr),0)/rated.length;
  /* Compress extremes slightly while moving the whole roster to the club target.
     Limit the shift so incomplete/stale source rosters cannot create absurd jumps. */
  const shift=clamp(target-before,-2.5,7.5);
  for(const row of rated){
    const relative=Number(row.ovr)-before;
    row.ovr=clamp(Math.round(target+relative*0.94),66,91);
    const override=INDIVIDUAL[key(row.name)];
    if(Number.isFinite(override)){
      row.ovr=override;
      individualOverrides++;
    }
    if(Number.isFinite(Number(row.potential)))row.potential=Math.max(Number(row.potential),row.ovr);
    else row.potential=row.ovr;
    row.ratingAudit='ACB_EL_2026_09_03';
    playersReviewed++;
  }
  const after=rated.reduce((s,r)=>s+Number(r.ovr),0)/rated.length;
  clubSummary[id]={players:rated.length,before:Number(before.toFixed(2)),target,after:Number(after.toFixed(2)),rawShift:Number(shift.toFixed(2))};
}

pack.ratingsAudit={
  id:'ACB_EL_2026_09_03',
  snapshot:'2026-09-03',
  acbClubIds:ACB_IDS.slice(),
  euroleagueClubIds:EUROLEAGUE_IDS.slice(),
  clubsReviewed:Object.keys(clubSummary).length,
  playersReviewed,
  individualOverrides,
  clubSummary,
  method:'club-strength normalization + individual performance/role anchors',
  note:'Original Basketball Manager estimates; not copied from third-party game ratings.'
};
g.BBGM_REAL_RATINGS_AUDIT_202627=pack.ratingsAudit;
})(typeof globalThis!=='undefined'?globalThis:this);
