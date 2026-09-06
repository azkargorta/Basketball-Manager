const fs=require('fs');
const app=fs.readFileSync('js/app.js','utf8');
function expect(value,message){if(!value)throw new Error(message)}
expect(app.includes("function ensureSeasonBoardPriority(){if(!state?.board||!/-0[789]-/.test(state.currentDate||''))return"),'La prioridad anual debe generarse solo al inicio de temporada');
expect(app.includes("boardPrioritySeason:state.season"),'La decisión de directiva debe estar ligada a una temporada');
expect(!app.includes("La directiva plantea una prioridad"),'No deben generarse prioridades de directiva recurrentes');
expect(app.includes("youngGames>=30"),'La evaluación de cantera debe medir partidos de sub-22');
expect(app.includes("delta:-10"),'La cantera sin desarrollo ni objetivo debe reducir confianza');
expect(app.includes("priority==='RESULTS'"),'La prioridad de resultados debe evitar penalizar el uso de cantera');
expect(app.includes("coachRequestSeason:state.season"),'La petición del entrenador debe aparecer en avisos');
expect(app.includes("delta=signed?7:-14"),'La petición aceptada debe premiar cumplir y penalizar mucho incumplir');
expect(app.includes("data-offer-counter"),'Las ofertas deben permitir renegociar');
expect(app.includes("function counterIncomingOffer"),'Debe existir la lógica de contraoferta');
console.log('v48.15 season commitments: OK');
