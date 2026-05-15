# Mundial 2026 Fixture Engine

Aplicacion React + TypeScript para consultar un calendario parcial del Mundial 2026 y simular fase de grupos, terceros clasificados, llaves eliminatorias y sanciones disciplinarias.

## Estado del Proyecto

Este proyecto debe tratarse como una app en evolucion, no como una fuente oficial completa. El dataset local actual incluye 12 de los 104 partidos del torneo. Los registros marcados como `date-only` tienen fecha oficial pero no hora validada en el dataset local.

Fuente de referencia recomendada para completar o verificar datos: calendario oficial de FIFA 2026.

## Stack

- Vite 8
- React 19
- TypeScript 6
- Tailwind CSS 4
- ESLint con reglas TypeScript type-aware
- Node test runner para pruebas de dominio

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

En Windows, si PowerShell bloquea `npm.ps1`, usar `npm.cmd`:

```bash
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## Datos

- `src/data/fifaData.json`: equipos, sedes y metadatos del torneo.
- `public/data/matches.json`: calendario parcial consumido por la UI.
- `backend/scraper.js`: generador estatico del calendario parcial. No es un scraper real.

Reglas importantes:

- No guardar horarios inventados como UTC.
- Si un partido solo tiene fecha, usar `officialDate` y `kickoffStatus: "date-only"`.
- Si un partido tiene horario confirmado, usar `officialDate`, `utcDateString` y `kickoffStatus: "confirmed"`.
- Validar datos con `src/services/matchValidation.ts` antes de usarlos en UI.

## Calidad y Seguridad

Antes de entregar cambios ejecutar:

```bash
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd audit
```

El proyecto evita dependencias de scraping/headless en el frontend. Si se implementa ingesta real de datos, debe vivir en un paquete backend separado, con fuente, timestamp, schema y pruebas.

## Limitaciones Conocidas

- Calendario local incompleto: 12/104 partidos.
- Internacionalizacion incompleta: parte de la UI sigue hardcodeada en espanol.
- `App.tsx` todavia concentra demasiada responsabilidad y debe dividirse por features.
- No hay CI configurado.
- No hay E2E ni pruebas visuales.

## Roadmap Tecnico

1. Completar pipeline de datos oficiales para los 104 partidos.
2. Separar `App.tsx` en features: partidos, grupos, llaves, sedes y estadisticas.
3. Eliminar modulos duplicados o muertos.
4. Completar i18n.
5. Agregar CI con lint, tests, build y audit.
6. Agregar pruebas E2E para los flujos principales.
