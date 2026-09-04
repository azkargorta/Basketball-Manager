const fs = require('fs');
const read = file => fs.readFileSync(`${__dirname}/${file}`, 'utf8');
const app = read('js/app.js');
const css = read('css/ui-v034.css');

for (const fn of ['notificationTarget', 'notificationActionsHtml', 'openInboxTarget', 'preseasonMatchFromEvent']) {
  if (!app.includes(`function ${fn}(`)) throw new Error(`Falta ${fn}`);
}

const expectedActions = [
  ['RESULT', 'Ver resumen'],
  ['SCOUT_COMPLETE', 'Ver informe'],
  ['INJURY', 'Abrir departamento médico'],
  ['SCOUTING', 'Abrir scouting'],
  ['CONTRACT', 'Revisar contratos'],
  ['NBA', 'Abrir NBA / Draft'],
  ['NATIONAL', 'Ver internacionales'],
  ['SPONSOR', 'Abrir patrocinadores'],
  ['COMPETITION', 'Ver competición']
];
for (const [type, label] of expectedActions) {
  if (!app.includes(`'${type}'`) || !app.includes(`label:'${label}'`)) throw new Error(`Falta la acción ${type}: ${label}`);
}

if (!app.includes('data-inbox-open')) throw new Error('Las notificaciones no renderizan el acceso contextual');
if (!app.includes('{matchId:nm.id}')) throw new Error('Los resultados oficiales no guardan la referencia del partido');
if (!app.includes('{preseasonMatchId:fr.id}')) throw new Error('Los amistosos no guardan la referencia del partido');
if (!app.includes('competitionName=comp(m.competitionId)?.name')) throw new Error('El resumen no admite amistosos');

for (const token of ['minmax(0, 1fr) !important', 'max-width: 100%', '.inbox-primary-action', '.notice-row.resolved']) {
  if (!css.includes(token)) throw new Error(`Falta la protección visual: ${token}`);
}

console.log(JSON.stringify({marketFiltersFluid:true,quickActions:expectedActions.length,matchDeepLinks:true,legacyMessages:true,ok:true},null,2));
