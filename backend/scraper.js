import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_DIR = path.join(__dirname, '../public/data');
const TARGET_FILE = path.join(TARGET_DIR, 'matches.json');

const scheduledMatches = [
  ['M001', 'A', 'Mexico', 'MEX', 'South Africa', 'RSA', '2026-06-11T19:00:00.000Z', 'Mexico City Stadium', 'America/Mexico_City', true, 'confirmed'],
  ['M002', 'A', 'South Korea', 'KOR', 'Czechia', 'CZE', '2026-06-11T12:00:00.000Z', 'Estadio Guadalajara', 'America/Mexico_City', false, 'date-only'],
  ['M003', 'B', 'Canada', 'CAN', 'Bosnia and Herzegovina', 'BIH', '2026-06-12T12:00:00.000Z', 'Toronto Stadium', 'America/Toronto', false, 'date-only'],
  ['M004', 'D', 'USA', 'USA', 'Paraguay', 'PAR', '2026-06-12T12:00:00.000Z', 'Los Angeles Stadium', 'America/Los_Angeles', false, 'date-only'],
  ['M005', 'C', 'Haiti', 'HAI', 'Scotland', 'SCO', '2026-06-13T12:00:00.000Z', 'Boston Stadium', 'America/New_York', false, 'date-only'],
  ['M006', 'D', 'Australia', 'AUS', 'Türkiye', 'TUR', '2026-06-13T12:00:00.000Z', 'BC Place Vancouver', 'America/Vancouver', false, 'date-only'],
  ['M007', 'C', 'Brazil', 'BRA', 'Morocco', 'MAR', '2026-06-13T12:00:00.000Z', 'New York New Jersey Stadium', 'America/New_York', false, 'date-only'],
  ['M008', 'B', 'Qatar', 'QAT', 'Switzerland', 'SUI', '2026-06-13T12:00:00.000Z', 'San Francisco Bay Area Stadium', 'America/Los_Angeles', false, 'date-only'],
  ['M009', 'E', 'Ivory Coast', 'CIV', 'Ecuador', 'ECU', '2026-06-14T12:00:00.000Z', 'Philadelphia Stadium', 'America/New_York', false, 'date-only'],
  ['M010', 'E', 'Germany', 'GER', 'Curaçao', 'CUW', '2026-06-14T12:00:00.000Z', 'Houston Stadium', 'America/Chicago', false, 'date-only'],
  ['M011', 'F', 'Netherlands', 'NED', 'Japan', 'JPN', '2026-06-14T12:00:00.000Z', 'Dallas Stadium', 'America/Chicago', false, 'date-only'],
  ['M012', 'F', 'Sweden', 'SWE', 'Tunisia', 'TUN', '2026-06-14T12:00:00.000Z', 'Estadio Monterrey', 'America/Monterrey', false, 'date-only'],
];

const toMatchDTO = ([
  matchId,
  groupId,
  team1Name,
  team1Code,
  team2Name,
  team2Code,
  sourceDateString,
  venue,
  venueTimeZone,
  isOpening,
  kickoffStatus,
]) => {
  const officialDate = sourceDateString.slice(0, 10);
  const hasConfirmedKickoff = kickoffStatus === 'confirmed';

  return {
    matchId,
    stage: `Fase de Grupos (Grupo ${groupId})`,
    groupId,
    team1: { name: team1Name, code: team1Code, score: null },
    team2: { name: team2Name, code: team2Code, score: null },
    status: 'SCHEDULED',
    officialDate,
    ...(hasConfirmedKickoff ? { utcDateString: sourceDateString } : {}),
    venue,
    stadium: venue,
    venueTimeZone,
    isOpening,
    kickoffStatus,
    source: 'official-schedule',
  };
};

function writeSchedule() {
  const matches = scheduledMatches.map(toMatchDTO);

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  fs.writeFileSync(TARGET_FILE, `${JSON.stringify(matches, null, 2)}\n`, 'utf8');
  console.log(`Calendario parcial escrito: ${matches.length} partidos. Los registros date-only no incluyen hora UTC.`);
}

writeSchedule();
