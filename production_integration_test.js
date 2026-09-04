const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const clean=url=>url.split('?')[0].replace(/^\.\//,'');

const html=read('index.html');
const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>clean(m[1]));
const styles=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(m=>clean(m[1]));
const assets=[...scripts,...styles,'manifest.webmanifest','icons/app-icon-192.png'];
const appSource=read('js/app.js');
if(appSource.includes("Bienvenido a Baskonia"))throw new Error('Nueva carrera conserva el mensaje fijo de Baskonia');
if(!appSource.includes('state.board.objectives=projectObjectives(userClub())'))throw new Error('Nueva carrera no genera objetivos para el club elegido');
if(!appSource.includes('objectiveModelVersion=4'))throw new Error('Falta la migración actual de objetivos por club');
const sw=read('sw.js');
const coreBlock=sw.match(/const CORE\s*=\s*\[([\s\S]*?)\];/);
if(!coreBlock)throw new Error('No se pudo leer CORE en sw.js');
const core=new Set([...coreBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map(m=>clean(m[1])));
const missingCache=assets.filter(asset=>!core.has(asset));
if(missingCache.length)throw new Error(`Recursos sin caché offline: ${missingCache.join(', ')}`);
for(const file of [...scripts,...styles])if(!fs.existsSync(path.join(root,file)))throw new Error(`Recurso público inexistente: ${file}`);

for(const file of scripts){
  if(file==='js/app.js')break;
  vm.runInThisContext(read(file),{filename:file});
}
const B=globalThis.BBGM;
const world=B.createWorld();
if(world.clubs.length!==150)throw new Error(`Se esperaban 150 clubes y hay ${world.clubs.length}`);
const realPlayers=world.clubs.flatMap(c=>c.roster||[]).filter(p=>p.realWorldIdentity);
if(realPlayers.length<1500)throw new Error(`Cobertura real insuficiente: ${realPlayers.length} jugadores`);
if(realPlayers.some(p=>!p.realWorldProfileNormalized))throw new Error('Hay jugadores reales sin normalización de perfil');
const quality=B.realWorldDataQuality.summarize(realPlayers);
if(quality.duplicatePositions||quality.incompatiblePositions||quality.invalidHeights)throw new Error(`Calidad posicional inválida: ${JSON.stringify(quality)}`);
const tavares=realPlayers.find(p=>`${p.firstName} ${p.lastName}`==='Edy Tavares');
if(!tavares||tavares.heightCm!==220)throw new Error(`Altura de Edy Tavares incorrecta: ${tavares?.heightCm}`);
if(world.dataPack?.version!==globalThis.BBGM_VERSION.dataPackVersion)throw new Error('La versión del Data Pack no coincide con la versión central');
console.log(JSON.stringify({version:globalThis.BBGM_VERSION.code,clubs:world.clubs.length,realPlayers,quality,offlineAssets:assets.length},(key,value)=>key==='realPlayers'?value.length:value,2));
