(function(g){
  'use strict';
  const BBGM=g.BBGM=g.BBGM||{};

  const NAME_POOLS={
    ESP:{first:['Iker','Jon','Unai','Aitor','Mikel','Ander','Sergio','Pablo','Hugo','Álex','Diego','Íñigo'],last:['Martínez','García','López','Fernández','Ruiz','Gómez','Navarro','Vidal','Sanz','Iglesias','Etxeberria','Aguirre']},
    USA:{first:['Jalen','Marcus','Jordan','Trey','Kevin','Malik','Darius','Chris','Dylan','Ethan','Noah','Tyler'],last:['Williams','Brown','Smith','Taylor','Miller','Johnson','Jones','Parker','Wilson','Harris','Walker','Carter']},
    SRB:{first:['Nikola','Luka','Stefan','Andrej','Miloš','Marko','Nemanja','Aleksa','Vuk','Bogdan'],last:['Petrović','Jovanović','Ilić','Kovačević','Marković','Ristić','Popović','Vuković','Nikolić','Stojanović']},
    FRA:{first:['Théo','Hugo','Louis','Mathis','Nicolas','Alexandre','Yanis','Maxime','Noah','Clément'],last:['Martin','Bernard','Dubois','Thomas','Robert','Lefèvre','Moreau','Laurent','Simon','Michel']},
    LTU:{first:['Mantas','Rokas','Domantas','Lukas','Ignas','Tadas','Arnas','Dovydas','Mindaugas','Paulius'],last:['Kazlauskas','Petrauskas','Jankauskas','Žukauskas','Vaitkus','Stankevičius','Balčiūnas','Mačiulis','Kavaliauskas','Sabonis']},
    ARG:{first:['Facundo','Nicolás','Tomás','Juan','Bruno','Lautaro','Mateo','Santiago','Franco','Luciano'],last:['González','Fernández','Rodríguez','Martínez','García','Sánchez','Romero','Álvarez','Pérez','Acosta']},
    GRE:{first:['Nikos','Giorgos','Kostas','Dimitris','Yannis','Vasilis','Panagiotis','Thanasis','Antonis','Manolis'],last:['Papadopoulos','Georgiou','Nikolaidis','Pappas','Kostas','Vasileiou','Ioannidis','Dimitriou','Christodoulou','Antetokounmpo']},
    CRO:{first:['Luka','Ivan','Ante','Dario','Mario','Karlo','Josip','Matej','Roko','Tomislav'],last:['Horvat','Kovačić','Babić','Marić','Jurić','Novak','Knežević','Pavić','Šarić','Božić']},
    TUR:{first:['Eren','Emir','Kerem','Can','Alperen','Mert','Berk','Yiğit','Oğuz','Onur'],last:['Yılmaz','Kaya','Demir','Şahin','Çelik','Aydın','Arslan','Koç','Kurt','Öztürk']},
    SLO:{first:['Luka','Žiga','Jan','Jaka','Miha','Rok','Klemen','Blaž','Gregor','Anže'],last:['Novak','Kovačič','Horvat','Krajnc','Zupan','Mlakar','Vidmar','Kos','Rozman','Dragić']},
    GER:{first:['Jonas','Maximilian','Lukas','Leon','Moritz','Felix','Niklas','Johannes','Daniel','Tim'],last:['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Hoffmann','Schulz']},
    ITA:{first:['Lorenzo','Matteo','Andrea','Marco','Alessandro','Davide','Simone','Federico','Riccardo','Gabriele'],last:['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco']},
    ISR:{first:['Noam','Yam','Omer','Tal','Idan','Nadav','Amit','Lior','Eitan','Gil'],last:['Cohen','Levi','Mizrahi','Peretz','Biton','Dahan','Azulay','Avraham','Ben David','Shahar']},
    MNE:{first:['Nikola','Marko','Luka','Petar','Miloš','Danilo','Vuk','Filip','Bojan','Nemanja'],last:['Vukčević','Popović','Nikolić','Radović','Jovanović','Ivanović','Đukanović','Bošković','Mugoša','Kovačević']},
    BIH:{first:['Amar','Emir','Adin','Haris','Kenan','Mirza','Dino','Tarik','Nedim','Armin'],last:['Hadžić','Kovačević','Dedić','Alić','Begić','Hodžić','Ibrahimović','Mujkić','Šehić','Mehić']},
    AUT:{first:['Lukas','Felix','Jakob','Florian','Maximilian','David','Paul','Simon','Moritz','Leon'],last:['Gruber','Huber','Wagner','Müller','Pichler','Steiner','Moser','Bauer','Hofer','Leitner']},
    ROU:{first:['Andrei','Vlad','Mihai','Alexandru','Radu','Ionuț','Ștefan','Bogdan','Cristian','Darius'],last:['Popescu','Ionescu','Dumitru','Stan','Gheorghe','Radu','Stoica','Marin','Tudor','Dobre']}
  };
  const AGENTS=['Aleksandar Sports','Basque Hoops Agency','NorthStar Basketball','Mediterranean Players','Prime Court Management','Atlantic Sports Group','Balkan Elite','EuroHoops Representation'];
  const NATIONALITIES=['ESP','USA','SRB','FRA','LTU','ARG','GRE','CRO','TUR','SLO','GER','ITA','ISR','MNE','BIH','AUT','ROU'];
  const CLUB_NATION_WEIGHTS={
    1:{ESP:24,USA:23,SRB:8,FRA:8,LTU:7,ARG:5,GRE:4,CRO:6,TUR:3,SLO:5,GER:3,ITA:4},
    2:{ESP:31,USA:15,ARG:7,FRA:10,SRB:7,LTU:4,CRO:5,SLO:6,GER:4,ITA:4,GRE:4,TUR:3},
    3:{ESP:30,USA:15,FRA:9,ARG:5,SRB:6,LTU:5,CRO:5,SLO:6,GER:5,ITA:5,GRE:5,TUR:4},
    4:{ESP:29,USA:20,FRA:7,SRB:5,ARG:5,LTU:5,CRO:5,SLO:5,GER:5,ITA:5,GRE:5,TUR:4},
    5:{ESP:38,USA:18,SRB:5,FRA:6,ARG:5,LTU:4,CRO:5,SLO:4,GER:3,ITA:4,GRE:4,TUR:4},
    6:{ESP:40,USA:17,FRA:6,ARG:5,SRB:5,LTU:4,CRO:4,SLO:4,GER:4,ITA:4,GRE:4,TUR:3},
    7:{ESP:32,USA:22,FRA:6,ARG:5,SRB:6,LTU:4,CRO:5,SLO:4,GER:4,ITA:4,GRE:4,TUR:4},
    8:{ESP:35,USA:21,FRA:5,ARG:5,SRB:5,LTU:4,CRO:4,SLO:4,GER:4,ITA:4,GRE:5,TUR:4},
    9:{GRE:35,USA:19,SRB:7,FRA:6,LTU:5,CRO:6,TUR:4,SLO:5,ESP:3,ARG:3,GER:3,ITA:4},
    10:{GRE:35,USA:20,SRB:7,FRA:6,LTU:5,CRO:5,TUR:5,SLO:5,ESP:3,ARG:3,GER:3,ITA:3},
    11:{TUR:31,USA:20,SRB:8,GRE:5,FRA:6,LTU:4,CRO:5,SLO:5,ESP:4,ARG:3,GER:4,ITA:5},
    12:{FRA:28,USA:25,SRB:7,GRE:5,LTU:4,CRO:5,TUR:4,SLO:5,ESP:4,ARG:3,GER:5,ITA:5}
  };
  const CLUB_HOME_NATION={
    1:'ESP',2:'ESP',3:'ESP',4:'ESP',5:'ESP',6:'ESP',7:'ESP',8:'ESP',
    9:'GRE',10:'GRE',11:'TUR',12:'FRA',13:'ESP',14:'ESP',15:'ESP',16:'ESP',17:'ESP',18:'ESP',19:'ESP',20:'ESP',21:'ESP',22:'ESP',23:'ESP',
    24:'TUR',25:'TUR',26:'ISR',27:'SRB',28:'ITA',29:'FRA',30:'ISR',31:'SRB',32:'TUR',33:'LTU',34:'FRA',35:'GER',36:'ITA',
    37:'ESP',38:'ESP',39:'ESP',40:'ESP',41:'ESP',42:'ESP',43:'ESP',44:'ESP'
  };
  function weightedNationality(rng,clubId=null,homeNation=null){
    let weights=CLUB_NATION_WEIGHTS[clubId];
    if(!weights){
      const home=homeNation||CLUB_HOME_NATION[clubId]||'ESP';
      weights={ESP:8,USA:22,SRB:7,FRA:7,LTU:5,ARG:4,GRE:4,CRO:4,TUR:4,SLO:4,GER:4,ITA:4,ISR:2,MNE:2,BIH:2,AUT:2,ROU:2};
      if(home in weights)weights[home]+=30;
      if(home==='ISR'){weights.USA+=7;weights.SRB+=3;weights.FRA+=3;}
      if(home==='MNE'||home==='BIH'){weights.SRB+=5;weights.CRO+=3;}
    }
    const entries=Object.entries(weights);let total=entries.reduce((a,[,w])=>a+w,0),pick=rng.next()*total;
    for(const [n,w] of entries){pick-=w;if(pick<=0)return n}return entries[0][0];
  }
  function generatedName(nationality,rng){const pool=NAME_POOLS[nationality]||NAME_POOLS.ESP;return {firstName:rng.pick(pool.first),lastName:rng.pick(pool.last)}};


  const OFFSETS={
    PG:{finishing:-2,midRange:1,threePoint:2,freeThrow:2,ballHandling:8,passing:8,shotCreation:5,pickAndRoll:7,postPlay:-12,offBall:1,perimeterDefense:2,interiorDefense:-12,helpDefense:2,steal:4,block:-14,defensiveRebound:-8,offensiveRebound:-12,speed:7,strength:-7,vertical:0,stamina:5,durability:0,basketballIq:4,decisionMaking:4,consistency:0,competitiveness:0,workRate:0},
    SG:{finishing:1,midRange:3,threePoint:5,freeThrow:3,ballHandling:3,passing:0,shotCreation:4,pickAndRoll:1,postPlay:-5,offBall:4,perimeterDefense:3,interiorDefense:-7,helpDefense:0,steal:2,block:-8,defensiveRebound:-4,offensiveRebound:-6,speed:5,strength:-3,vertical:3,stamina:3,durability:0,basketballIq:1,decisionMaking:1,consistency:0,competitiveness:0,workRate:0},
    SF:{finishing:2,midRange:2,threePoint:2,freeThrow:1,ballHandling:0,passing:-1,shotCreation:1,pickAndRoll:-2,postPlay:0,offBall:3,perimeterDefense:3,interiorDefense:0,helpDefense:2,steal:1,block:-1,defensiveRebound:2,offensiveRebound:0,speed:1,strength:1,vertical:2,stamina:2,durability:0,basketballIq:1,decisionMaking:1,consistency:0,competitiveness:0,workRate:0},
    PF:{finishing:5,midRange:0,threePoint:-2,freeThrow:-1,ballHandling:-5,passing:-3,shotCreation:-3,pickAndRoll:-1,postPlay:6,offBall:1,perimeterDefense:-2,interiorDefense:6,helpDefense:4,steal:-2,block:5,defensiveRebound:7,offensiveRebound:6,speed:-3,strength:6,vertical:3,stamina:0,durability:1,basketballIq:1,decisionMaking:0,consistency:0,competitiveness:1,workRate:1},
    C:{finishing:8,midRange:-4,threePoint:-10,freeThrow:-4,ballHandling:-12,passing:-5,shotCreation:-8,pickAndRoll:-3,postPlay:10,offBall:-1,perimeterDefense:-8,interiorDefense:10,helpDefense:5,steal:-4,block:10,defensiveRebound:10,offensiveRebound:10,speed:-8,strength:10,vertical:4,stamina:-2,durability:1,basketballIq:0,decisionMaking:-1,consistency:0,competitiveness:1,workRate:1}
  };

  // Perfiles de calidad inspirados en la jerarquía deportiva real 2026/27 de cada club.
  // No representan una valoración oficial ni copian una base de datos de terceros.
  const CLUB_PROFILES={
    1:[
      {p:'SG',o:86,r:'STAR',age:27},{p:'SF',o:82,r:'STARTER',age:29},{p:'SF',o:81,r:'STARTER',age:28},{p:'SF',o:80,r:'STARTER',age:28},
      {p:'PG',o:79,r:'IMPORTANT',age:29},{p:'SF',o:79,r:'IMPORTANT',age:25},{p:'C',o:78,r:'IMPORTANT',age:24},{p:'PG',o:77,r:'ROTATION',age:24},
      {p:'SG',o:76,r:'ROTATION',age:23},{p:'PF',o:75,r:'ROTATION',age:36},{p:'PF',o:73,r:'BENCH',age:24},{p:'SF',o:72,r:'BENCH',age:23}
    ],
    2:[
      {p:'C',o:90,r:'STAR',age:34},{p:'PG',o:89,r:'STAR',age:35},{p:'PG',o:86,r:'STARTER',age:25},{p:'SF',o:85,r:'STARTER',age:31},
      {p:'PF',o:84,r:'STARTER',age:28},{p:'PF',o:83,r:'IMPORTANT',age:30},{p:'PF',o:82,r:'IMPORTANT',age:25},{p:'PF',o:82,r:'IMPORTANT',age:24},
      {p:'SF',o:82,r:'ROTATION',age:31},{p:'PG',o:80,r:'ROTATION',age:29},{p:'C',o:80,r:'ROTATION',age:31},{p:'SF',o:79,r:'BENCH',age:24}
    ],
    3:[
      {p:'PG',o:87,r:'STAR',age:29},{p:'C',o:86,r:'STAR',age:29},{p:'SF',o:84,r:'STARTER',age:28},{p:'PF',o:84,r:'STARTER',age:30},
      {p:'SG',o:83,r:'STARTER',age:27},{p:'PF',o:82,r:'IMPORTANT',age:29},{p:'PG',o:81,r:'IMPORTANT',age:27},{p:'SF',o:81,r:'ROTATION',age:25},
      {p:'C',o:80,r:'ROTATION',age:27},{p:'SG',o:79,r:'ROTATION',age:25},{p:'SF',o:78,r:'BENCH',age:23},{p:'PF',o:77,r:'BENCH',age:22}
    ],
    4:[
      {p:'PG',o:87,r:'STAR',age:28},{p:'SG',o:83,r:'STARTER',age:28},{p:'SF',o:82,r:'STARTER',age:31},{p:'PF',o:82,r:'STARTER',age:30},
      {p:'PF',o:81,r:'IMPORTANT',age:31},{p:'C',o:80,r:'IMPORTANT',age:29},{p:'PF',o:79,r:'ROTATION',age:27},{p:'C',o:79,r:'ROTATION',age:30},
      {p:'SG',o:78,r:'ROTATION',age:25},{p:'SF',o:77,r:'ROTATION',age:27},{p:'PG',o:75,r:'DEVELOPMENT',age:21},{p:'SG',o:73,r:'DEVELOPMENT',age:20}
    ],
    5:[
      {p:'PG',o:83,r:'STAR',age:29},{p:'C',o:82,r:'STARTER',age:27},{p:'SF',o:81,r:'STARTER',age:28},{p:'SG',o:80,r:'STARTER',age:27},
      {p:'PF',o:80,r:'IMPORTANT',age:29},{p:'PG',o:79,r:'IMPORTANT',age:30},{p:'SF',o:78,r:'ROTATION',age:26},{p:'C',o:78,r:'ROTATION',age:28},
      {p:'SG',o:77,r:'ROTATION',age:25},{p:'PF',o:77,r:'ROTATION',age:27},{p:'SF',o:75,r:'BENCH',age:24},{p:'PG',o:74,r:'BENCH',age:23}
    ],
    6:[
      {p:'SG',o:82,r:'STAR',age:31},{p:'PG',o:80,r:'STARTER',age:28},{p:'C',o:79,r:'STARTER',age:29},{p:'SF',o:78,r:'STARTER',age:27},
      {p:'PF',o:78,r:'IMPORTANT',age:27},{p:'SG',o:77,r:'IMPORTANT',age:25},{p:'PG',o:76,r:'ROTATION',age:23},{p:'SF',o:76,r:'ROTATION',age:24},
      {p:'C',o:75,r:'ROTATION',age:25},{p:'PF',o:74,r:'ROTATION',age:23},{p:'SF',o:72,r:'DEVELOPMENT',age:20},{p:'PG',o:71,r:'DEVELOPMENT',age:19}
    ],
    7:[
      {p:'PG',o:81,r:'STAR',age:29},{p:'C',o:80,r:'STARTER',age:30},{p:'SF',o:79,r:'STARTER',age:28},{p:'SG',o:79,r:'STARTER',age:27},
      {p:'PF',o:78,r:'IMPORTANT',age:29},{p:'PG',o:77,r:'IMPORTANT',age:27},{p:'C',o:77,r:'ROTATION',age:28},{p:'SF',o:76,r:'ROTATION',age:25},
      {p:'SG',o:76,r:'ROTATION',age:24},{p:'PF',o:75,r:'ROTATION',age:26},{p:'SF',o:73,r:'BENCH',age:23},{p:'PG',o:72,r:'BENCH',age:22}
    ],
    8:[
      {p:'PG',o:81,r:'STAR',age:30},{p:'PF',o:80,r:'STARTER',age:29},{p:'SG',o:79,r:'STARTER',age:27},{p:'C',o:79,r:'STARTER',age:28},
      {p:'SF',o:78,r:'IMPORTANT',age:28},{p:'PG',o:77,r:'IMPORTANT',age:26},{p:'PF',o:77,r:'ROTATION',age:27},{p:'C',o:76,r:'ROTATION',age:27},
      {p:'SG',o:75,r:'ROTATION',age:24},{p:'SF',o:75,r:'ROTATION',age:25},{p:'PF',o:73,r:'BENCH',age:23},{p:'PG',o:72,r:'BENCH',age:21}
    ],
    9:[
      {p:'PG',o:90,r:'STAR',age:30},{p:'C',o:89,r:'STAR',age:31},{p:'SF',o:87,r:'STARTER',age:29},{p:'PF',o:86,r:'STARTER',age:30},
      {p:'SG',o:85,r:'STARTER',age:28},{p:'PG',o:84,r:'IMPORTANT',age:29},{p:'C',o:84,r:'IMPORTANT',age:28},{p:'SF',o:83,r:'IMPORTANT',age:27},
      {p:'PF',o:82,r:'ROTATION',age:27},{p:'SG',o:82,r:'ROTATION',age:26},{p:'SF',o:80,r:'ROTATION',age:25},{p:'C',o:79,r:'BENCH',age:24}
    ],
    10:[
      {p:'PG',o:91,r:'STAR',age:30},{p:'C',o:89,r:'STAR',age:30},{p:'SF',o:87,r:'STARTER',age:29},{p:'PF',o:86,r:'STARTER',age:28},
      {p:'SG',o:85,r:'STARTER',age:28},{p:'PG',o:85,r:'IMPORTANT',age:27},{p:'PF',o:84,r:'IMPORTANT',age:29},{p:'C',o:83,r:'IMPORTANT',age:28},
      {p:'SF',o:83,r:'ROTATION',age:26},{p:'SG',o:82,r:'ROTATION',age:27},{p:'PF',o:81,r:'ROTATION',age:25},{p:'PG',o:79,r:'BENCH',age:24}
    ],
    11:[
      {p:'PG',o:89,r:'STAR',age:29},{p:'C',o:87,r:'STAR',age:30},{p:'SF',o:86,r:'STARTER',age:28},{p:'PF',o:85,r:'STARTER',age:28},
      {p:'SG',o:84,r:'STARTER',age:27},{p:'PG',o:83,r:'IMPORTANT',age:28},{p:'PF',o:83,r:'IMPORTANT',age:29},{p:'C',o:82,r:'IMPORTANT',age:27},
      {p:'SF',o:82,r:'ROTATION',age:26},{p:'SG',o:81,r:'ROTATION',age:25},{p:'PF',o:80,r:'ROTATION',age:25},{p:'PG',o:78,r:'BENCH',age:23}
    ],
    12:[
      {p:'PG',o:90,r:'STAR',age:30},{p:'SG',o:88,r:'STAR',age:29},{p:'C',o:86,r:'STARTER',age:28},{p:'SF',o:85,r:'STARTER',age:28},
      {p:'PF',o:84,r:'STARTER',age:29},{p:'PG',o:83,r:'IMPORTANT',age:27},{p:'SF',o:82,r:'IMPORTANT',age:27},{p:'C',o:82,r:'IMPORTANT',age:29},
      {p:'SG',o:81,r:'ROTATION',age:26},{p:'PF',o:81,r:'ROTATION',age:27},{p:'SF',o:79,r:'ROTATION',age:24},{p:'PG',o:78,r:'BENCH',age:23}
    ]
  };

  function attr(base,pos,rng){
    const out={};
    for(const k in OFFSETS[pos]) out[k]=BBGM.clamp(base+OFFSETS[pos][k]+rng.gaussian()*4.3,20,98);
    return out;
  }

  function secondary(pos,rng){
    if(rng.next()>.58)return null;
    return {PG:'SG',SG:rng.next()<.5?'PG':'SF',SF:rng.next()<.5?'SG':'PF',PF:rng.next()<.5?'SF':'C',C:'PF'}[pos];
  }

  function tendencies(pos,rng){
    const usage={PG:62,SG:68,SF:56,PF:48,C:45}[pos];
    const three={PG:61,SG:70,SF:58,PF:42,C:18}[pos];
    return {
      usage:BBGM.clamp(usage+rng.gaussian()*9,5,95),
      threePointTendency:BBGM.clamp(three+rng.gaussian()*11,5,95),
      insideTendency:BBGM.clamp(100-three+rng.gaussian()*8,5,95),
      passingTendency:BBGM.clamp(50+rng.gaussian()*10,5,95),
      foulTendency:BBGM.clamp(50+rng.gaussian()*10,5,95),
      turnoverTendency:BBGM.clamp(50+rng.gaussian()*10,5,95),
      offensiveReboundTendency:BBGM.clamp(45+rng.gaussian()*12,5,95)
    };
  }

  function salaryFor(base,role,rng){
    const roleFactor={STAR:1.24,STARTER:1.08,IMPORTANT:1.0,ROTATION:.86,SPECIALIST:.78,DEVELOPMENT:.62,BENCH:.58}[role]||1;
    return Math.max(120000,Math.round((base*base*145*roleFactor)+(rng.next()*140000)));
  }

  function makePersonality(rng){
    return {
      professionalism:BBGM.clamp(50+rng.gaussian()*18,10,98),ambition:BBGM.clamp(55+rng.gaussian()*20,10,98),loyalty:BBGM.clamp(50+rng.gaussian()*22,5,98),
      temperament:BBGM.clamp(55+rng.gaussian()*20,5,98),pressure:BBGM.clamp(55+rng.gaussian()*18,10,98),adaptability:BBGM.clamp(55+rng.gaussian()*18,10,98),
      workEthic:BBGM.clamp(58+rng.gaussian()*17,10,98),ego:BBGM.clamp(48+rng.gaussian()*22,5,98)
    };
  }

  function normalizeOverall(p,target){
    for(let pass=0;pass<3;pass++){
      const delta=target-BBGM.overall(p);
      for(const k in p.attributes)p.attributes[k]=BBGM.clamp(p.attributes[k]+delta,20,98);
    }
    p.targetOverall=target;
  }

  function potentialFor(target,age,rng){
    let extra=0;
    if(age<=19)extra=7+rng.next()*8;
    else if(age<=21)extra=5+rng.next()*7;
    else if(age<=23)extra=3+rng.next()*5;
    else if(age<=25)extra=1+rng.next()*4;
    else if(age<=28)extra=rng.next()*2;
    else extra=-rng.next()*1.5;
    return BBGM.clamp(target+extra,Math.max(45,target-2),96);
  }

  function makePlayer(id,base,pos,role,rng,opts={}){
    const age=opts.age ?? (19+Math.floor(rng.next()*16));
    const salary=opts.salary ?? salaryFor(base,role,rng);
    const contractYears=opts.contractYears ?? (1+Math.floor(rng.next()*3));
    const nationality=opts.nationality||weightedNationality(rng,opts.clubId||null,opts.homeNation||null);
    const personName=generatedName(nationality,rng);
    const p={
      id,
      firstName:opts.firstName||personName.firstName,
      lastName:opts.lastName||personName.lastName,
      age,
      nationality,
      heightCm:{PG:188,SG:194,SF:201,PF:206,C:211}[pos]+Math.floor(rng.next()*7)-3,
      primaryPosition:pos,
      secondaryPosition:secondary(pos,rng),
      role,
      salary,
      contractYears,
      releaseClause:opts.releaseClause ?? Math.round(salary*(2.2+rng.next()*3.3)/50000)*50000,
      agent:opts.agent||rng.pick(AGENTS),
      transferListed:false,
      attributes:attr(base,pos,rng),
      state:{morale:65+Math.round(rng.next()*15),confidence:65+Math.round(rng.next()*15),fitness:94+Math.round(rng.next()*5),fatigue:Math.round(rng.next()*7),form:45+Math.round(rng.next()*10),matchRhythm:68+Math.round(rng.next()*8),teamAdaptation:72+Math.round(rng.next()*8)},
      tendencies:tendencies(pos,rng),
      personality:makePersonality(rng),
      trainingFocus:'BALANCED'
    };
    const target=opts.targetOverall ?? base;
    normalizeOverall(p,target);
    p.potentialReal=opts.potentialReal ?? potentialFor(target,age,rng);
    p.publicKnowledge=opts.publicKnowledge ?? (target>=84?1:target>=79&&rng.next()<.55?1:0);
    return p;
  }

  function genericProfile(base,rep,rng){
    const pos=['PG','SG','SF','PF','C','PG','SG','SF','PF','C','SF','PG'];
    const off=[4.4,3.1,2.2,1.6,1.0,.1,-.7,-1.4,-2.0,-2.7,-4.1,-5.0];
    return pos.map((p,i)=>{
      const o=Math.round(BBGM.clamp(base+off[i]+rng.gaussian()*.45,58,base>=84?97:92));
      let r=i===0&&base>=78?'STAR':i<5?'STARTER':i<7?'IMPORTANT':i<10?'ROTATION':i===10?'SPECIALIST':'BENCH';
      const age=i<2?26+Math.floor(rng.next()*5):i<8?23+Math.floor(rng.next()*8):20+Math.floor(rng.next()*9);
      return {p,o,r,age};
    });
  }

  function makeRoster(clubId,seed,clubRep,clubBase,homeNation=null,rosterSize=12){
    const rng=new BBGM.RNG(seed),out=[],profile=((typeof V20_BLUEPRINTS!=='undefined'&&V20_BLUEPRINTS[clubId])||CLUB_PROFILES[clubId]||genericProfile(clubBase||74,clubRep,rng)).slice();
    const extraPos=['PG','SG','SF','PF','C'];
    while(profile.length<rosterSize){const i=profile.length;profile.push({p:extraPos[i%5],o:Math.round(BBGM.clamp((clubBase||74)-4.5-(i-12)*.7+rng.gaussian()*.6,58,90)),r:i<13?'ROTATION':'BENCH',age:20+Math.floor(rng.next()*12)})}
    for(let i=0;i<profile.length;i++){
      const s=profile[i];
      const p=makePlayer(clubId*100+i+1,s.o,s.p,s.r,rng,{age:s.age,targetOverall:s.o,clubId,homeNation});
      if(clubRep>=90&&s.o>=78)p.publicKnowledge=1;
      out.push(p);
    }
    return out;
  }

  function makeClub(id,name,shortName,base,seed,rep,salaryBudget,cashBudget,opts={}){
    const rng=new BBGM.RNG(seed);
    const roster=makeRoster(id,seed+50,rep,base,opts.homeNation||null,opts.rosterSize||rosterSizeV20(id,opts.leagueLevel||'EUROPE'));
    if(opts.leagueLevel==='NBA'){for(const p of roster){p.salary=Math.round((p.salary*6.5)/50000)*50000;p.releaseClause=null;p.publicKnowledge=Math.max(p.publicKnowledge||0,BBGM.overall(p)>=84?1:0)}}
    const wageBill=roster.reduce((s,p)=>s+p.salary,0);
    const coachNation=weightedNationality(rng,id,opts.homeNation||null),coachName=generatedName(coachNation,rng);
    return {
      id,name,shortName,baseRating:base,reputation:rep,country:opts.country||'España',leagueLevel:opts.leagueLevel||'EUROPE',leagueName:opts.leagueName||'Europa',homeNation:opts.homeNation||null,loanEligible:opts.loanEligible!==false,
      salaryBudget:Math.max(salaryBudget,Math.round(wageBill*1.06)),cashBudget,staffBudget:Math.round((1800000+rep*22000)/50000)*50000,roster,
      coach:{id:1000+id,name:`${coachName.firstName} ${coachName.lastName}`,nationality:coachNation,offense:base+rng.gaussian()*2,defense:base+rng.gaussian()*2,development:base+rng.gaussian()*2,manManagement:base+rng.gaussian()*2,reputation:rep,youthTrust:48+rng.next()*30,salary:Math.round((450000+rep*9000+rng.next()*250000)/50000)*50000},
      style:{pace:48+rng.gaussian()*8,perimeterFocus:50+rng.gaussian()*8,pressure:50+rng.gaussian()*8,offensiveReboundEmphasis:50},
      color:'#6fa8ff'
    };
  }

  function createFreeAgents(){
    const rng=new BBGM.RNG(90262026),out=[];
    const posCycle=['PG','SG','SF','PF','C'];
    for(let i=0;i<32;i++){
      const pos=posCycle[i%5];
      const tier=i<4?80:i<12?76:i<23?71:66;
      const target=BBGM.clamp(tier+rng.gaussian()*2.0,62,83);
      const age=i<7?27+Math.floor(rng.next()*7):19+Math.floor(rng.next()*13);
      const role=target>=79?'IMPORTANT':target>=75?'ROTATION':target>=70?'SPECIALIST':'BENCH';
      const p=makePlayer(50000+i,target,pos,role,rng,{age,contractYears:0,targetOverall:target,publicKnowledge:target>=80?1:0});
      p.salary=Math.max(100000,Math.round(p.salary*(.82+rng.next()*.18)/50000)*50000);
      p.releaseClause=null;p.contractYears=0;p.freeAgent=true;
      out.push(p);
    }
    return out;
  }

  function createScoutStaff(){
    return [
      {id:1,name:'Mikel Arana',nationality:'ESP',age:45,region:'EUROPE',judgingCurrent:84,judgingPotential:78,speed:82,europe:92,usa:48,youth:70,professionals:87,salary:310000},
      {id:2,name:'Darius Cole',nationality:'USA',age:41,region:'USA',judgingCurrent:79,judgingPotential:82,speed:77,europe:50,usa:94,youth:80,professionals:78,salary:300000},
      {id:3,name:'Nikola Vasić',nationality:'SRB',age:52,region:'YOUTH',judgingCurrent:75,judgingPotential:90,speed:70,europe:87,usa:55,youth:95,professionals:69,salary:330000}
    ];
  }

  function createScoutMarket(){
    return [
      {id:101,name:'Jean Moreau',nationality:'FRA',age:48,region:'EUROPE',judgingCurrent:88,judgingPotential:80,speed:75,europe:95,usa:46,youth:72,professionals:91,salary:410000},
      {id:102,name:'Tyler Harris',nationality:'USA',age:39,region:'USA',judgingCurrent:82,judgingPotential:88,speed:86,europe:47,usa:96,youth:88,professionals:80,salary:430000},
      {id:103,name:'Mantas Petrauskas',nationality:'LTU',age:44,region:'YOUTH',judgingCurrent:78,judgingPotential:94,speed:73,europe:90,usa:51,youth:97,professionals:72,salary:450000},
      {id:104,name:'Facundo Romero',nationality:'ARG',age:46,region:'EUROPE',judgingCurrent:81,judgingPotential:86,speed:80,europe:84,usa:68,youth:90,professionals:79,salary:360000},
      {id:105,name:'Emir Demir',nationality:'TUR',age:50,region:'EUROPE',judgingCurrent:86,judgingPotential:82,speed:70,europe:93,usa:44,youth:78,professionals:90,salary:390000},
      {id:106,name:'Luka Kovačić',nationality:'CRO',age:42,region:'YOUTH',judgingCurrent:76,judgingPotential:91,speed:84,europe:89,usa:57,youth:95,professionals:71,salary:375000}
    ];
  }

  function createCoachMarket(){
    return [
      {id:2001,name:'Sergio Aguirre',nationality:'ESP',age:48,reputation:84,offense:86,defense:79,development:82,manManagement:84,youthTrust:75,salary:1150000},
      {id:2002,name:'Nikola Marković',nationality:'SRB',age:55,reputation:88,offense:82,defense:90,development:78,manManagement:87,youthTrust:62,salary:1450000},
      {id:2003,name:'Théo Lefèvre',nationality:'FRA',age:45,reputation:79,offense:84,defense:80,development:88,manManagement:76,youthTrust:90,salary:900000},
      {id:2004,name:'Darius Johnson',nationality:'USA',age:47,reputation:82,offense:91,defense:74,development:80,manManagement:78,youthTrust:72,salary:1200000},
      {id:2005,name:'Mantas Kazlauskas',nationality:'LTU',age:51,reputation:86,offense:83,defense:86,development:90,manManagement:81,youthTrust:86,salary:1350000},
      {id:2006,name:'Kostas Nikolaidis',nationality:'GRE',age:53,reputation:90,offense:88,defense:88,development:81,manManagement:91,youthTrust:65,salary:1650000}
    ];
  }


  function createYouthClass(clubId,count=7,seed=26092026,homeNation=null){
    const rng=new BBGM.RNG(seed+clubId*1009),out=[];
    const posCycle=['PG','SG','SF','PF','C'];
    for(let i=0;i<count;i++){
      const age=16+Math.floor(rng.next()*5);
      const pos=posCycle[(i+Math.floor(rng.next()*5))%5];
      const ageBase={16:50,17:53,18:56,19:59,20:62}[age]||56;
      const qualityBoost=(clubId===1?3.5:2.0)+rng.gaussian()*3.0;
      const rare=rng.next();
      let target=BBGM.clamp(ageBase+qualityBoost,47,71);
      // Un porcentaje muy pequeño llega ya más preparado: evita que el mundo pierda estrellas a largo plazo.
      if(rare<.025)target=BBGM.clamp(target+5+rng.next()*4,52,76);
      let potBoost=age<=17?20:age===18?17:age===19?14:11;
      if(rare<.025)potBoost+=14+rng.next()*7; else if(rare<.10)potBoost+=8+rng.next()*5; else if(rare<.27)potBoost+=3+rng.next()*4;
      const potential=BBGM.clamp(target+potBoost+rng.gaussian()*3,Math.max(target+4,64),96);
      const p=makePlayer(70000+clubId*100+i,target,pos,'DEVELOPMENT',rng,{age,targetOverall:target,potentialReal:potential,clubId,homeNation,contractYears:Math.max(1,22-age),publicKnowledge:0});
      p.salary=Math.round((50000+(target-45)*4500+rng.next()*30000)/5000)*5000;
      p.releaseClause=null;p.academy=true;p.generated=true;p.academyEntryAge=age;p.trainingFocus='BALANCED';
      out.push(p);
    }
    return out;
  }



  // ===== v0.20 — Realismo inicial y contenido =====
  const V20_BLUEPRINTS={
    2:[
      {p:'C',o:90,r:'STAR',age:34},{p:'PG',o:89,r:'STAR',age:35},{p:'PG',o:86,r:'STARTER',age:25},{p:'SF',o:85,r:'STARTER',age:31},{p:'PF',o:84,r:'STARTER',age:28},
      {p:'PF',o:83,r:'IMPORTANT',age:30},{p:'PF',o:82,r:'IMPORTANT',age:25},{p:'SF',o:82,r:'IMPORTANT',age:31},{p:'C',o:81,r:'IMPORTANT',age:31},{p:'PG',o:80,r:'ROTATION',age:29},
      {p:'PF',o:80,r:'ROTATION',age:24},{p:'SG',o:80,r:'ROTATION',age:24},{p:'SF',o:79,r:'ROTATION',age:24},{p:'C',o:79,r:'ROTATION',age:27},{p:'PF',o:78,r:'BENCH',age:24},{p:'SG',o:77,r:'BENCH',age:38},{p:'SF',o:77,r:'BENCH',age:25}
    ],
    3:[
      {p:'SG',o:87,r:'STAR',age:33},{p:'C',o:85,r:'STAR',age:29},{p:'PG',o:84,r:'STARTER',age:28},{p:'SF',o:83,r:'STARTER',age:27},{p:'PF',o:82,r:'STARTER',age:26},
      {p:'PG',o:81,r:'IMPORTANT',age:22},{p:'SG',o:81,r:'IMPORTANT',age:31},{p:'SF',o:80,r:'ROTATION',age:26},{p:'C',o:80,r:'ROTATION',age:25},{p:'PF',o:79,r:'ROTATION',age:25},
      {p:'PG',o:78,r:'ROTATION',age:28},{p:'SF',o:78,r:'BENCH',age:27},{p:'C',o:78,r:'BENCH',age:26},{p:'SF',o:76,r:'DEVELOPMENT',age:23}
    ],
    4:[
      {p:'PG',o:87,r:'STAR',age:28},{p:'SG',o:83,r:'STARTER',age:28},{p:'SF',o:82,r:'STARTER',age:31},{p:'PF',o:82,r:'STARTER',age:30},{p:'PF',o:81,r:'IMPORTANT',age:31},
      {p:'SG',o:81,r:'IMPORTANT',age:28},{p:'C',o:80,r:'IMPORTANT',age:29},{p:'PG',o:80,r:'ROTATION',age:22},{p:'SG',o:79,r:'ROTATION',age:27},{p:'PF',o:79,r:'ROTATION',age:27},
      {p:'C',o:79,r:'ROTATION',age:30},{p:'SF',o:78,r:'ROTATION',age:26},{p:'PF',o:77,r:'BENCH',age:22},{p:'SG',o:76,r:'BENCH',age:23},{p:'PG',o:75,r:'DEVELOPMENT',age:21},{p:'SG',o:73,r:'DEVELOPMENT',age:20}
    ]
  };

  const REALISM_V20={
    version:'2026_27_fictional',
    description:'Perfiles ficticios calibrados por nivel de club, rol, edad y mercado. No usa nombres ni estadísticas reales de jugadores.'
  };
  const CLUB_IDENTITY_V20={
    1:{rosterSize:13,pace:62,perimeter:64,pressure:55,oreb:47,salaryScale:1.08},
    2:{rosterSize:17,pace:52,perimeter:49,pressure:61,oreb:57,salaryScale:1.18},
    3:{rosterSize:14,pace:56,perimeter:61,pressure:56,oreb:50,salaryScale:1.15},
    4:{rosterSize:16,pace:63,perimeter:58,pressure:60,oreb:54,salaryScale:1.10},
    5:{rosterSize:13,pace:55,perimeter:54,pressure:63,oreb:55,salaryScale:.94},
    6:{rosterSize:13,pace:54,perimeter:56,pressure:56,oreb:51,salaryScale:.82},
    9:{rosterSize:14,pace:55,perimeter:52,pressure:66,oreb:59,salaryScale:1.20},
    10:{rosterSize:14,pace:61,perimeter:61,pressure:63,oreb:55,salaryScale:1.22},
    11:{rosterSize:14,pace:58,perimeter:58,pressure:64,oreb:54,salaryScale:1.18},
    12:{rosterSize:14,pace:60,perimeter:61,pressure:55,oreb:48,salaryScale:1.14}
  };
  const ARCHETYPE_LABELS={
    PLAYMAKER:'Organizador',SCORING_GUARD:'Base anotador',POINT_DEFENDER:'Base defensivo',
    SHOOTER:'Tirador',SHOT_CREATOR:'Anotador',TWO_WAY_GUARD:'Escolta two-way',
    THREE_D:'3&D',WING_CREATOR:'Alero creador',SLASHER:'Alero físico',
    STRETCH_FOUR:'Ala-pívot abierto',INTERIOR_FOUR:'Interior móvil',DEFENSIVE_FORWARD:'Ala-pívot defensivo',
    RIM_PROTECTOR:'Protector del aro',FINISHING_BIG:'Finalizador',SKILLED_BIG:'Pívot técnico'
  };
  function rosterSizeV20(id,leagueLevel){
    if(CLUB_IDENTITY_V20[id]?.rosterSize)return CLUB_IDENTITY_V20[id].rosterSize;
    if(leagueLevel==='NBA')return 15;
    if(leagueLevel==='EUROLEAGUE')return 14;
    if(leagueLevel==='ACB')return 13;
    return 12;
  }
  function pickArchetypeV20(pos,rng){
    const m={PG:['PLAYMAKER','SCORING_GUARD','POINT_DEFENDER'],SG:['SHOOTER','SHOT_CREATOR','TWO_WAY_GUARD'],SF:['THREE_D','WING_CREATOR','SLASHER'],PF:['STRETCH_FOUR','INTERIOR_FOUR','DEFENSIVE_FORWARD'],C:['RIM_PROTECTOR','FINISHING_BIG','SKILLED_BIG']};
    return rng.pick(m[pos]||m.SF);
  }
  function applyArchetypeV20(p,rng){
    const a=p.attributes,arch=pickArchetypeV20(p.primaryPosition,rng);p.archetype=arch;p.archetypeLabel=ARCHETYPE_LABELS[arch];
    const bump=(keys,n)=>keys.forEach(k=>a[k]=BBGM.clamp(a[k]+n,20,98));
    const cut=(keys,n)=>keys.forEach(k=>a[k]=BBGM.clamp(a[k]-n,20,98));
    if(arch==='PLAYMAKER'){bump(['passing','ballHandling','pickAndRoll','decisionMaking'],5);cut(['postPlay','offensiveRebound'],3);p.tendencies.passingTendency+=12;p.tendencies.usage-=7}
    if(arch==='SCORING_GUARD'){bump(['shotCreation','threePoint','finishing'],5);cut(['helpDefense','defensiveRebound'],2);p.tendencies.usage+=12}
    if(arch==='POINT_DEFENDER'){bump(['perimeterDefense','steal','strength'],5);cut(['shotCreation'],3);p.tendencies.usage-=5}
    if(arch==='SHOOTER'){bump(['threePoint','offBall','freeThrow'],6);cut(['postPlay'],3);p.tendencies.threePointTendency+=14}
    if(arch==='SHOT_CREATOR'){bump(['shotCreation','midRange','ballHandling'],5);cut(['helpDefense'],2);p.tendencies.usage+=10}
    if(arch==='TWO_WAY_GUARD'){bump(['perimeterDefense','threePoint','steal'],4);cut(['postPlay'],2)}
    if(arch==='THREE_D'){bump(['threePoint','perimeterDefense','helpDefense'],5);cut(['shotCreation','ballHandling'],2);p.tendencies.usage-=6}
    if(arch==='WING_CREATOR'){bump(['shotCreation','passing','ballHandling'],4);cut(['interiorDefense'],2);p.tendencies.usage+=7}
    if(arch==='SLASHER'){bump(['finishing','speed','vertical'],5);cut(['threePoint'],3);p.tendencies.insideTendency+=12}
    if(arch==='STRETCH_FOUR'){bump(['threePoint','offBall','midRange'],5);cut(['offensiveRebound','postPlay'],2);p.tendencies.threePointTendency+=15}
    if(arch==='INTERIOR_FOUR'){bump(['finishing','postPlay','offensiveRebound'],5);cut(['threePoint'],3);p.tendencies.insideTendency+=12}
    if(arch==='DEFENSIVE_FORWARD'){bump(['interiorDefense','helpDefense','defensiveRebound'],5);cut(['shotCreation'],3);p.tendencies.usage-=5}
    if(arch==='RIM_PROTECTOR'){bump(['block','interiorDefense','defensiveRebound'],6);cut(['threePoint','ballHandling'],3);p.tendencies.usage-=6}
    if(arch==='FINISHING_BIG'){bump(['finishing','strength','offensiveRebound'],6);cut(['threePoint','ballHandling'],3);p.tendencies.insideTendency+=14}
    if(arch==='SKILLED_BIG'){bump(['passing','postPlay','midRange'],5);cut(['speed'],2);p.tendencies.passingTendency+=8}
    for(const k of Object.keys(p.tendencies))p.tendencies[k]=BBGM.clamp(p.tendencies[k],5,95);
    normalizeOverall(p,p.targetOverall||BBGM.overall(p));
  }
  function realisticSalaryV20(p,club,rng){
    const o=BBGM.overall(p),role={STAR:1.20,STARTER:1.08,IMPORTANT:1.0,ROTATION:.82,SPECIALIST:.72,DEVELOPMENT:.48,BENCH:.55}[p.role]||1;
    if(club.leagueLevel==='NBA'){
      const base=1800000+Math.pow(Math.max(0,o-68),2)*105000;
      return Math.round(base*role/50000)*50000;
    }
    const level={EUROLEAGUE:1.08,ACB:.72,EUROPE:.62,PRIMERA_FEB:.27,INTERNATIONAL:.33}[club.leagueLevel]||.55;
    const rep=.78+Math.max(0,(club.reputation||70)-55)/110;
    const identity=CLUB_IDENTITY_V20[club.id]?.salaryScale||1;
    const base=90000+Math.pow(Math.max(0,o-62),2)*3000;
    const age=p.age>=33?.88:p.age<=22?.82:1;
    return Math.max(70000,Math.round(base*level*rep*identity*role*age/5000)*5000);
  }
  function contractYearsV20(p,rng){
    if(p.age>=34)return 1;
    if(p.age>=31)return rng.next()<.72?1:2;
    if(p.age<=22)return 2+(rng.next()<.58?1:0)+(rng.next()<.15?1:0);
    if(['STAR','STARTER'].includes(p.role))return 2+(rng.next()<.38?1:0);
    return 1+(rng.next()<.62?1:0)+(rng.next()<.12?1:0);
  }
  function calibratePlayerV20(p,club,rng){
    p.promisedRole=p.promisedRole||p.role;
    p.salary=realisticSalaryV20(p,club,rng);
    p.contractYears=contractYearsV20(p,rng);
    if(club.leagueLevel==='NBA')p.releaseClause=null;
    else{
      const mult=(p.age<=23&&p.potentialReal>=84?5.0:3.0)+rng.next()*2.2;
      p.releaseClause=Math.round(p.salary*mult/50000)*50000;
    }
    applyArchetypeV20(p,rng);
  }
  function applyClubIdentityV20(club){
    const i=CLUB_IDENTITY_V20[club.id];if(!i)return;
    club.style.pace=i.pace;club.style.perimeterFocus=i.perimeter;club.style.pressure=i.pressure;club.style.offensiveReboundEmphasis=i.oreb;
  }
  function applyWorldRealismV20(clubs){
    for(const club of clubs){
      const rng=new BBGM.RNG(20262000+club.id*811);
      applyClubIdentityV20(club);
      for(const p of club.roster)calibratePlayerV20(p,club,rng);
      const bill=club.roster.reduce((s,p)=>s+(p.salary||0),0);
      club.salaryBudget=Math.max(Math.round(bill*1.10/50000)*50000,Math.round((club.salaryBudget||0)*.82/50000)*50000);
      club.realismV20={dataPack:'fictional_2026_27',rosterModel:'club_level',salaryModel:'role_level_age'};
    }
  }

  function createWorld(){
    const clubs=[
      // ACB / Euroliga y principales clubes europeos. Ratings propios orientativos del juego, no oficiales.
      makeClub(1,'Baskonia','BAS',80.5,101,82,14500000,3600000,{country:'España',leagueLevel:'EUROLEAGUE',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(2,'Real Madrid','RMA',86.5,202,95,26000000,9000000,{country:'España',leagueLevel:'EUROLEAGUE',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(3,'Barcelona','BAR',84.5,303,94,24000000,8000000,{country:'España',leagueLevel:'EUROLEAGUE',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(4,'Valencia Basket','VAL',82.5,404,86,17500000,5000000,{country:'España',leagueLevel:'EUROLEAGUE',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(5,'Unicaja','UNI',80.5,505,82,15500000,4400000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(6,'Asisa Joventut','JOV',78.8,606,75,12000000,3200000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(7,'Dreamland Gran Canaria','GCA',78.0,707,75,12200000,3200000,{country:'España',leagueLevel:'EUROPE',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(8,'UCAM Murcia','MUR',78.8,808,76,12200000,3200000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(9,'Olympiacos','OLY',86.5,909,94,25000000,8500000,{country:'Grecia',leagueLevel:'EUROLEAGUE',leagueName:'Greek Basket League',homeNation:'GRE'}),
      makeClub(10,'Panathinaikos','PAN',87.0,1001,95,26000000,9000000,{country:'Grecia',leagueLevel:'EUROLEAGUE',leagueName:'Greek Basket League',homeNation:'GRE'}),
      makeClub(11,'Fenerbahçe','FEN',85.5,1101,92,24500000,8500000,{country:'Turquía',leagueLevel:'EUROLEAGUE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(12,'AS Monaco','MON',84.5,1201,90,23000000,7800000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),

      makeClub(13,'Casademont Zaragoza','ZAR',76.8,1301,70,9500000,2300000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(14,'FIATC Girona','GIR',74.8,1401,65,8200000,1800000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(15,'iLERNA Lleida','LLE',74.5,1501,64,8000000,1700000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(16,'Kids&Us Manresa','MAN',77.4,1601,72,10200000,2500000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(17,'La Laguna Tenerife','TEN',79.5,1701,79,13000000,3400000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(18,'Leyma Coruña','COR',72.8,1801,59,7000000,1300000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(19,'Monbus Obradoiro','OBR',73.8,1901,62,7600000,1500000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(20,'MoraBanc Andorra','AND',75.2,2001,67,8500000,1900000,{country:'Andorra',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(21,'San Pablo Burgos','BUR',73.2,2101,61,7300000,1450000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(22,'Río Breogán','BRE',74.6,2201,65,8000000,1650000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),
      makeClub(23,'Surne Bilbao','BIL',75.8,2301,69,9000000,2100000,{country:'España',leagueLevel:'ACB',leagueName:'Liga ACB',homeNation:'ESP'}),

      makeClub(24,'Dubai Basketball','DUB',84.0,2401,88,22500000,8000000,{country:'EAU',leagueLevel:'EUROLEAGUE',leagueName:'ABA League',homeNation:'USA'}),
      makeClub(25,'Anadolu Efes','EFE',83.2,2501,89,22000000,7600000,{country:'Turquía',leagueLevel:'EUROLEAGUE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(26,'Hapoel Tel Aviv','HAP',83.0,2601,86,21000000,7200000,{country:'Israel',leagueLevel:'EUROLEAGUE',leagueName:'Israeli Premier League',homeNation:'ISR'}),
      makeClub(27,'Partizán Belgrado','PAR',82.3,2701,87,19500000,6200000,{country:'Serbia',leagueLevel:'EUROLEAGUE',leagueName:'ABA League',homeNation:'SRB'}),
      makeClub(28,'Olimpia Milano','MIL',82.0,2801,86,20000000,6500000,{country:'Italia',leagueLevel:'EUROLEAGUE',leagueName:'LBA Serie A',homeNation:'ITA'}),
      makeClub(29,'ASVEL Villeurbanne','ASV',78.5,2901,78,14500000,3900000,{country:'Francia',leagueLevel:'EUROLEAGUE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(30,'Maccabi Tel Aviv','MAC',81.2,3001,84,18000000,5500000,{country:'Israel',leagueLevel:'EUROLEAGUE',leagueName:'Israeli Premier League',homeNation:'ISR'}),
      makeClub(31,'Estrella Roja','CZV',81.5,3101,85,18500000,5600000,{country:'Serbia',leagueLevel:'EUROLEAGUE',leagueName:'ABA League',homeNation:'SRB'}),
      makeClub(32,'Besiktas','BES',79.5,3201,80,15500000,4400000,{country:'Turquía',leagueLevel:'EUROLEAGUE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(33,'Zalgiris Kaunas','ZAL',80.5,3301,83,16500000,4800000,{country:'Lituania',leagueLevel:'EUROLEAGUE',leagueName:'LKL',homeNation:'LTU'}),
      makeClub(34,'Paris Basketball','PRS',82.0,3401,84,18000000,5500000,{country:'Francia',leagueLevel:'EUROLEAGUE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(35,'Bayern Múnich','BAY',81.4,3501,84,18500000,5600000,{country:'Alemania',leagueLevel:'EUROLEAGUE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(36,'Virtus Bolonia','VIR',80.3,3601,82,17000000,5000000,{country:'Italia',leagueLevel:'EUROLEAGUE',leagueName:'LBA Serie A',homeNation:'ITA'}),

      // Clubes externos de Primera FEB para mercado y cesiones. No hay ascensos/descensos.
      makeClub(37,'Movistar Estudiantes','EST',72.5,3701,66,6500000,1300000,{country:'España',leagueLevel:'PRIMERA_FEB',leagueName:'Primera FEB',homeNation:'ESP'}),
      makeClub(38,'Flexicar Fuenlabrada','FUE',70.8,3801,61,5800000,1100000,{country:'España',leagueLevel:'PRIMERA_FEB',leagueName:'Primera FEB',homeNation:'ESP'}),
      makeClub(39,'Palencia Baloncesto','PAL',69.8,3901,58,5200000,900000,{country:'España',leagueLevel:'PRIMERA_FEB',leagueName:'Primera FEB',homeNation:'ESP'}),
      makeClub(40,'HLA Alicante','ALI',69.2,4001,57,5000000,850000,{country:'España',leagueLevel:'PRIMERA_FEB',leagueName:'Primera FEB',homeNation:'ESP'}),
      makeClub(41,'Real Valladolid','VLL',68.8,4101,56,4800000,800000,{country:'España',leagueLevel:'PRIMERA_FEB',leagueName:'Primera FEB',homeNation:'ESP'}),
      makeClub(42,'Gipuzkoa Basket','GBC',70.2,4201,60,5400000,1000000,{country:'España',leagueLevel:'PRIMERA_FEB',leagueName:'Primera FEB',homeNation:'ESP'}),
      makeClub(43,'Club Ourense Baloncesto','OUR',68.5,4301,55,4600000,750000,{country:'España',leagueLevel:'PRIMERA_FEB',leagueName:'Primera FEB',homeNation:'ESP'}),
      makeClub(44,'Tizona Burgos','TIZ',69.5,4401,58,5000000,850000,{country:'España',leagueLevel:'PRIMERA_FEB',leagueName:'Primera FEB',homeNation:'ESP'}),

      // LNB Élite (Francia) — clubes externos para mercado, scouting y cesiones.
      makeClub(45,'JL Bourg','BOU',78.5,4501,77,12000000,3200000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(46,'Nanterre 92','NAN',76.5,4601,72,9800000,2300000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(47,'Le Mans Sarthe Basket','LEM',76.8,4701,73,10000000,2400000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(48,'Cholet Basket','CHO',77.0,4801,74,10200000,2500000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(49,'SIG Strasbourg','STR',75.8,4901,70,9300000,2100000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(50,'Limoges CSP','LIM',75.5,5001,72,9000000,2000000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(51,'JDA Dijon','DIJ',75.7,5101,71,9200000,2050000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),
      makeClub(52,'Le Portel','POR',72.8,5201,62,7200000,1400000,{country:'Francia',leagueLevel:'EUROPE',leagueName:'LNB Élite',homeNation:'FRA'}),

      // LBA Serie A (Italia).
      makeClub(53,'Germani Brescia','BREI',79.0,5301,78,12500000,3400000,{country:'Italia',leagueLevel:'EUROPE',leagueName:'LBA Serie A',homeNation:'ITA'}),
      makeClub(54,'Reyer Venezia','VEN',78.4,5401,77,12000000,3200000,{country:'Italia',leagueLevel:'EUROPE',leagueName:'LBA Serie A',homeNation:'ITA'}),
      makeClub(55,'Dolomiti Energia Trento','TRE',77.2,5501,73,10300000,2500000,{country:'Italia',leagueLevel:'EUROPE',leagueName:'LBA Serie A',homeNation:'ITA'}),
      makeClub(56,'Derthona Basket','TOR',77.0,5601,72,10200000,2450000,{country:'Italia',leagueLevel:'EUROPE',leagueName:'LBA Serie A',homeNation:'ITA'}),
      makeClub(57,'Pallacanestro Reggiana','REG',76.5,5701,71,9800000,2200000,{country:'Italia',leagueLevel:'EUROPE',leagueName:'LBA Serie A',homeNation:'ITA'}),
      makeClub(58,'Pallacanestro Trieste','TRI',75.5,5801,68,9000000,1900000,{country:'Italia',leagueLevel:'EUROPE',leagueName:'LBA Serie A',homeNation:'ITA'}),
      makeClub(59,'Dinamo Sassari','SAS',75.8,5901,70,9200000,2000000,{country:'Italia',leagueLevel:'EUROPE',leagueName:'LBA Serie A',homeNation:'ITA'}),
      makeClub(60,'Pallacanestro Varese','VAR',74.8,6001,67,8500000,1750000,{country:'Italia',leagueLevel:'EUROPE',leagueName:'LBA Serie A',homeNation:'ITA'}),

      // easyCredit BBL (Alemania).
      makeClub(61,'ALBA Berlin','ALB',79.5,6101,82,14500000,4200000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(62,'ratiopharm Ulm','ULM',79.2,6201,79,12800000,3500000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(63,'Würzburg Baskets','WUR',77.8,6301,74,10500000,2600000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(64,'MHP RIESEN Ludwigsburg','LUD',76.8,6401,72,9800000,2250000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(65,'Telekom Baskets Bonn','BON',77.0,6501,75,10500000,2650000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(66,'NINERS Chemnitz','CHE',77.6,6601,74,10400000,2550000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(67,'EWE Baskets Oldenburg','OLD',75.8,6701,70,9300000,2050000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(68,'Veolia Towers Hamburg','HAM',75.0,6801,67,8600000,1800000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(69,'Basketball Löwen Braunschweig','BRA',74.4,6901,65,8000000,1600000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),
      makeClub(70,'ROSTOCK SEAWOLVES','ROS',73.8,7001,63,7600000,1500000,{country:'Alemania',leagueLevel:'EUROPE',leagueName:'easyCredit BBL',homeNation:'GER'}),

      // Basketbol Süper Ligi (Turquía).
      makeClub(71,'Galatasaray','GAL',80.0,7101,83,15500000,4600000,{country:'Turquía',leagueLevel:'EUROPE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(72,'Türk Telekom','TTK',79.0,7201,80,13800000,3800000,{country:'Turquía',leagueLevel:'EUROPE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(73,'Bahçeşehir Koleji','BAH',79.5,7301,81,14500000,4200000,{country:'Turquía',leagueLevel:'EUROPE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(74,'TOFAŞ Bursa','TOF',77.5,7401,75,11000000,2850000,{country:'Turquía',leagueLevel:'EUROPE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(75,'Bursaspor','BURT',76.5,7501,72,10000000,2400000,{country:'Turquía',leagueLevel:'EUROPE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(76,'Mersin SK','MER',75.5,7601,68,9000000,1950000,{country:'Turquía',leagueLevel:'EUROPE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(77,'Petkim Spor','PET',74.8,7701,66,8500000,1750000,{country:'Turquía',leagueLevel:'EUROPE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),
      makeClub(78,'Darüşşafaka','DAR',74.5,7801,69,8500000,1800000,{country:'Turquía',leagueLevel:'EUROPE',leagueName:'Basketbol Süper Ligi',homeNation:'TUR'}),

      // Greek Basket League.
      makeClub(79,'AEK Athens','AEK',78.5,7901,78,12000000,3200000,{country:'Grecia',leagueLevel:'EUROPE',leagueName:'Greek Basket League',homeNation:'GRE'}),
      makeClub(80,'Aris Thessaloniki','ARI',77.0,8001,75,10500000,2600000,{country:'Grecia',leagueLevel:'EUROPE',leagueName:'Greek Basket League',homeNation:'GRE'}),
      makeClub(81,'PAOK Thessaloniki','PAO',76.8,8101,74,10200000,2500000,{country:'Grecia',leagueLevel:'EUROPE',leagueName:'Greek Basket League',homeNation:'GRE'}),
      makeClub(82,'Promitheas Patras','PRO',76.5,8201,72,9800000,2250000,{country:'Grecia',leagueLevel:'EUROPE',leagueName:'Greek Basket League',homeNation:'GRE'}),
      makeClub(83,'Peristeri','PER',75.5,8301,69,9000000,1900000,{country:'Grecia',leagueLevel:'EUROPE',leagueName:'Greek Basket League',homeNation:'GRE'}),
      makeClub(84,'Panionios','PANIO',74.0,8401,65,7800000,1550000,{country:'Grecia',leagueLevel:'EUROPE',leagueName:'Greek Basket League',homeNation:'GRE'}),

      // ABA League 2026/27 — parte de sus clubes ya existen arriba (Partizan, Estrella Roja y Dubai).
      makeClub(85,'Budućnost VOLI','BUD',79.5,8501,81,14000000,3900000,{country:'Montenegro',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'MNE'}),
      makeClub(86,'Cedevita Olimpija','CED',79.2,8601,80,13500000,3700000,{country:'Eslovenia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'SLO'}),
      makeClub(87,'Cibona','CIB',74.0,8701,70,8000000,1700000,{country:'Croacia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'CRO'}),
      makeClub(88,'FMP Beograd','FMP',75.5,8801,68,8500000,1800000,{country:'Serbia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'SRB'}),
      makeClub(89,'Igokea','IGO',76.8,8901,72,9800000,2300000,{country:'Bosnia y Herzegovina',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'BIH'}),
      makeClub(90,'Krka Novo Mesto','KRK',73.8,9001,64,7600000,1500000,{country:'Eslovenia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'SLO'}),
      makeClub(91,'Bosna Sarajevo','BOS',74.8,9101,69,8200000,1750000,{country:'Bosnia y Herzegovina',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'BIH'}),
      makeClub(92,'Mega Basket','MEG',77.5,9201,74,10000000,2400000,{country:'Serbia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'SRB'}),
      makeClub(93,'SC Derby','SCD',74.2,9301,65,7800000,1550000,{country:'Montenegro',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'MNE'}),
      makeClub(94,'Spartak Subotica','SPA',76.0,9401,71,9200000,2100000,{country:'Serbia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'SRB'}),
      makeClub(95,'U-BT Cluj-Napoca','CLU',79.0,9501,79,13000000,3500000,{country:'Rumanía',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'ROU'}),
      makeClub(96,'Zadar','ZAD',75.8,9601,72,9000000,2000000,{country:'Croacia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'CRO'}),

      // LKL (Lituania).
      makeClub(97,'Rytas Vilnius','RYT',78.8,9701,80,12500000,3400000,{country:'Lituania',leagueLevel:'EUROPE',leagueName:'LKL',homeNation:'LTU'}),
      makeClub(98,'Lietkabelis','LIE',76.8,9801,73,10000000,2350000,{country:'Lituania',leagueLevel:'EUROPE',leagueName:'LKL',homeNation:'LTU'}),
      makeClub(99,'Neptūnas Klaipėda','NEP',75.5,9901,68,8800000,1900000,{country:'Lituania',leagueLevel:'EUROPE',leagueName:'LKL',homeNation:'LTU'}),
      makeClub(100,'Juventus Utena','JUV',74.8,10001,66,8200000,1700000,{country:'Lituania',leagueLevel:'EUROPE',leagueName:'LKL',homeNation:'LTU'}),
      makeClub(101,'Šiauliai','SIA',73.5,10101,62,7400000,1450000,{country:'Lituania',leagueLevel:'EUROPE',leagueName:'LKL',homeNation:'LTU'}),

      // Israeli Premier League.
      makeClub(102,'Hapoel Jerusalem','JER',80.2,10201,83,15000000,4400000,{country:'Israel',leagueLevel:'EUROPE',leagueName:'Israeli Premier League',homeNation:'ISR'}),
      makeClub(103,'Bnei Herzliya','HER',75.5,10301,67,8800000,1850000,{country:'Israel',leagueLevel:'EUROPE',leagueName:'Israeli Premier League',homeNation:'ISR'}),
      makeClub(104,'Hapoel Holon','HOL',76.8,10401,72,10000000,2350000,{country:'Israel',leagueLevel:'EUROPE',leagueName:'Israeli Premier League',homeNation:'ISR'}),
      makeClub(105,'Hapoel Be’er Sheva','BESI',73.8,10501,62,7400000,1450000,{country:'Israel',leagueLevel:'EUROPE',leagueName:'Israeli Premier League',homeNation:'ISR'}),

      // ABA League: completamos el grupo de clubes externos de la edición 2026/27.
      makeClub(106,'Borac Čačak','BOR',74.8,10601,67,8200000,1750000,{country:'Serbia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'SRB'}),
      makeClub(107,'HKK Široki','SIR',72.8,10701,61,7000000,1300000,{country:'Bosnia y Herzegovina',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'BIH'}),
      makeClub(108,'Slovan Bratislava','SLOV',72.5,10801,60,6800000,1250000,{country:'Eslovaquia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'SLO'}),
      makeClub(109,'Perspektiva Ilirija','ILI',72.2,10901,59,6600000,1200000,{country:'Eslovenia',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'SLO'}),
      makeClub(110,'BC Vienna','VIE',73.5,11001,63,7400000,1450000,{country:'Austria',leagueLevel:'EUROPE',leagueName:'ABA League',homeNation:'AUT'}),

      // Liga Nacional de Básquet (Argentina) — mercado internacional y scouting.
      makeClub(111,'Instituto Córdoba','INS',75.5,11101,72,8500000,1900000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(112,'Boca Juniors','BOC',76.0,11201,76,9200000,2150000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(113,'Quimsa','QUI',75.8,11301,74,8800000,2000000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(114,'Olímpico La Banda','OLI',73.8,11401,66,7200000,1450000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(115,'San Lorenzo','SLOA',73.5,11501,69,7400000,1500000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(116,'Obras Basket','OBRARG',73.8,11601,67,7300000,1500000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(117,'Regatas Corrientes','REGARG',73.2,11701,65,7000000,1400000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(118,'Peñarol Mar del Plata','PEN',72.8,11801,66,6900000,1350000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(119,'Ferro Carril Oeste','FER',72.5,11901,64,6700000,1300000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),
      makeClub(120,'Gimnasia Comodoro','GIM',72.6,12001,63,6700000,1300000,{country:'Argentina',leagueLevel:'INTERNATIONAL',leagueName:'Liga Nacional Argentina',homeNation:'ARG'}),

      // NBA 2026/27: 30 franquicias como mercado externo. Plantillas ficticias y ratings propios del juego.
      makeClub(121,'Atlanta Hawks','ATL',85.0,12101,89,199000000,45500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(122,'Boston Celtics','BOSNBA',90.0,12201,94,209000000,53000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(123,'Brooklyn Nets','BKN',78.5,12301,82,186000000,35750000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(124,'Charlotte Hornets','CHA',80.0,12401,84,189000000,38000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(125,'Chicago Bulls','CHI',80.5,12501,84,190000000,38750000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(126,'Cleveland Cavaliers','CLE',89.0,12601,93,207000000,51500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(127,'Dallas Mavericks','DAL',83.0,12701,87,195000000,42500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(128,'Denver Nuggets','DEN',89.0,12801,93,207000000,51500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(129,'Detroit Pistons','DET',86.5,12901,90,202000000,47750000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(130,'Golden State Warriors','GSW',85.0,13001,89,199000000,45500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(131,'Houston Rockets','HOU',88.0,13101,92,205000000,50000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(132,'Indiana Pacers','IND',86.0,13201,90,201000000,47000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(133,'LA Clippers','LAC',82.5,13301,86,194000000,41750000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(134,'Los Angeles Lakers','LAL',86.0,13401,90,201000000,47000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(135,'Memphis Grizzlies','MEM',83.5,13501,88,196000000,43250000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(136,'Miami Heat','MIA',84.0,13601,88,197000000,44000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(137,'Milwaukee Bucks','MILNBA',84.0,13701,88,197000000,44000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(138,'Minnesota Timberwolves','MIN',88.0,13801,92,205000000,50000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(139,'New Orleans Pelicans','NOP',79.0,13901,83,187000000,36500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(140,'New York Knicks','NYK',89.5,14001,94,208000000,52250000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(141,'Oklahoma City Thunder','OKC',92.0,14101,96,213000000,56000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(142,'Orlando Magic','ORL',86.5,14201,90,202000000,47750000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(143,'Philadelphia 76ers','PHI',83.0,14301,87,195000000,42500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(144,'Phoenix Suns','PHX',82.0,14401,86,193000000,41000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(145,'Portland Trail Blazers','PORNBA',82.0,14501,86,193000000,41000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(146,'Sacramento Kings','SAC',81.0,14601,85,191000000,39500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(147,'San Antonio Spurs','SAS',89.0,14701,93,207000000,51500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(148,'Toronto Raptors','TORNBA',83.0,14801,87,195000000,42500000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(149,'Utah Jazz','UTA',78.0,14901,82,185000000,35000000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15}),
      makeClub(150,'Washington Wizards','WAS',78.5,15001,82,186000000,35750000,{country:'USA',leagueLevel:'NBA',leagueName:'NBA',homeNation:'USA',loanEligible:false,rosterSize:15})
    ];
    applyWorldRealismV20(clubs);
    const acb=[1,2,3,4,5,6,8,13,14,15,16,17,18,19,20,21,22,23];
    const el=[1,2,3,4,9,10,11,24,25,26,27,28,29,30,31,32,33,34,35,36];
    const comps=[
      {id:'ACB',name:'Liga ACB',clubIds:acb,rounds:BBGM.roundRobin(acb,true),standings:true},
      {id:'EL',name:'Euroliga',clubIds:el,rounds:BBGM.roundRobin(el,true),standings:true},
      {id:'SUPERCOPA',name:'Supercopa Endesa',clubIds:[],rounds:[],knockout:true},
      {id:'COPA',name:'Copa del Rey',clubIds:[],rounds:[],knockout:true},
      {id:'ACB_PO',name:'Playoffs ACB',clubIds:[],rounds:[],knockout:true},
      {id:'EL_PI',name:'Play-In Euroliga',clubIds:[],rounds:[],knockout:true},
      {id:'EL_PO',name:'Playoffs Euroliga',clubIds:[],rounds:[],knockout:true},
      {id:'EL_F4',name:'Final Four Euroliga',clubIds:[],rounds:[],knockout:true}
    ];
    const leagues=[...new Set(clubs.map(c=>c.leagueName).filter(Boolean))].sort().map(name=>({name,clubIds:clubs.filter(c=>c.leagueName===name).map(c=>c.id)}));
    return {clubs,competitions:comps,leagues,freeAgents:createFreeAgents(),agents:AGENTS.slice(),scoutStaff:createScoutStaff(),scoutMarket:createScoutMarket(),coachMarket:createCoachMarket(),realismPack:REALISM_V20};
  }

  BBGM.createWorld=createWorld;
  BBGM.createFreeAgents=createFreeAgents;
  BBGM.createScoutStaff=createScoutStaff;
  BBGM.createScoutMarket=createScoutMarket;
  BBGM.createCoachMarket=createCoachMarket;
  BBGM.createYouthClass=createYouthClass;
  BBGM.clubProfiles=CLUB_PROFILES;
  BBGM.realismV20=REALISM_V20;
  BBGM.applyWorldRealismV20=applyWorldRealismV20;
  BBGM.archetypeLabelsV20=ARCHETYPE_LABELS;
})(typeof globalThis!=='undefined'?globalThis:this);
