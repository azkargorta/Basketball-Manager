# Basketball Manager — Backlog World & Career

Estado acordado durante la revisión de diseño previa a v0.24.

## Principio de diseño transversal

**Profundidad por debajo, simplicidad por arriba.** El juego puede tener sistemas complejos internamente, pero cada pantalla debe mostrar primero solo la información necesaria para tomar decisiones. En móvil esto es prioritario.

## Puntos aprobados

1. **Mundo vivo y noticias.** Noticias separadas en `Mi equipo` y `Mundo`: fichajes, salidas, entrenadores despedidos, MVP, sorpresas, historias y sucesos relevantes.
2. **Historial del jugador.** En la ficha: clubes, títulos, estadísticas/hitos, lesiones y trayectoria.
3. **Relaciones y vestuario.** Problemas periódicos con entrenador/jugadores; decisiones con consecuencias y sin una respuesta buena universal.
4. **Identidad del club.** Cada club tiene filosofía, personalidad, presión y expectativas propias.
5. **Scouting con incertidumbre.** El nivel/potencial se descubre progresivamente.
6. **Cantera con peso.** Seguimiento, expectativas, desarrollo y aparición de jóvenes especiales como acontecimiento.
7. **Presentación de partidos.** Narrativa y claves del partido sin convertir el juego en un simulador de entrenador.
8. **Carrera del director deportivo.** Reputación, historial, ofertas de otros clubes, despidos y continuidad de carrera.
9. **Mercado con motivaciones propias.** Dinero, rol, minutos, títulos, Euroliga, país, entrenador, estabilidad y NBA influyen en las decisiones de jugadores/agentes.
10. **Planificación a medio/largo plazo.** Contratos futuros, necesidades por posición, sucesores y masa salarial comprometida.
11. **Memoria del mundo y prestigio.** Historial de temporadas, clubes y récords; prestigio dinámico.
12. **Entrenadores y staff con identidad.** Estilos, peticiones, relación con el director deportivo y consecuencias reales.
13. **Afición y prensa.** Presión contextual, reacción a resultados/fichajes/ventas y jugadores queridos por la afición.
14. **Contratos profundos.** Duración, sueldo, rol, bonus, opciones, cláusulas y negociación con agentes.
15. **Lesiones y gestión física.** Historial médico, riesgo, recuperación y reconocimientos médicos sin microgestión excesiva.
16. **Evolución y envejecimiento.** Potencial no determinista, curvas distintas y adaptación del perfil del jugador con la edad.
17. **Economía global dinámica.** Presupuestos y poder de clubes/ligas evolucionan según resultados y gestión.
18. **Eventos emergentes.** Prioridad alta. Sucesos derivados de la situación real de la partida, no eventos aleatorios desconectados.
19. **Estadísticas y herramientas de decisión.** Encaje, valor por salario, rendimiento, riesgo y análisis de plantilla.
20. **IA de clubes con proyecto propio.** Fichajes y ventas según necesidad, presupuesto, etapa competitiva y filosofía.
21. **Competiciones con identidad.** Copa, ACB, Euroliga, Play-In, playoffs y Final Four deben sentirse distintas y tener objetivos/contexto propios.
23. **Selecciones nacionales.** Afectan a prestigio, fatiga, lesiones y desarrollo; no es un manager de selecciones.
24. **Premios, récords y legado.** MVP, quintetos, mejor joven, récords e historial en la ficha del jugador.
25. **Retiradas y leyendas.** Las carreras quedan en la memoria del mundo y algunos retirados pueden volver como staff.
26. **Rumores y mercado activo todo el año.** Rumores diferenciados de información confirmada y seguimiento de objetivos.
27. **Química e identidad de plantilla.** Juntar OVR altos no garantiza encaje; roles, perfiles, continuidad y vestuario importan.
28. **Capitanes y liderazgo.** El capitán tiene influencia real y puede mediar/estabilizar el vestuario.
29. **Adaptación de fichajes.** País, idioma, experiencia, compañeros, entrenador y adaptabilidad afectan al tiempo de integración.
30. **Reputación y estatus de estrella.** Influye en mercado, afición, patrocinio, presión y salario.
32. **Dificultad global.** Solo tres opciones: `Fácil`, `Medio`, `Exigente`. Debe afectar globalmente a la experiencia de gestión. No se aceptan bonificaciones ocultas artificiales en el motor de partido.
33. **Evitar saturación de información.** PRIORIDAD CRÍTICA. Inicio enseña solo asuntos relevantes; perfiles usan capas/pestañas; colores y alertas se reservan para información que necesita atención.
34. **Guardado robusto y varias carreras.** Autosave, copias, exportar/importar y compatibilidad entre versiones.
35. **Ritmo de temporada.** Avance ágil, botón de continuar contextual y paradas automáticas cuando hay una decisión relevante.

## Aparcado

22. **Infraestructura del club.** Cantera/entrenamiento/médico/scouting por niveles. Buena idea, pero no prioritaria ahora.

## Descartado

31. **Rivalidades personales específicas entre jugadores/entrenadores.** No desarrollar como sistema independiente.

## Regla para jugadores reales

El pack de jugadores reales se mantiene separado del motor. Las futuras generaciones/cantera seguirán siendo ficticias. La versión pública futura podrá retirar el pack real sin rehacer la simulación.
