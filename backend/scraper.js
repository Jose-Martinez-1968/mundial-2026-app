import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TARGET_DIR = path.join(__dirname, '../public/data');
const TARGET_FILE = path.join(TARGET_DIR, 'matches.json');

const rawMatches = [
  // June 11 — Grupo A
  // México 2-0 Sudáfrica (confirmado FIFA/TYC)
  {
    matchId: 'M001',
    groupId: 'A',
    team1: { name: 'Mexico', code: 'MEX', score: 2 },
    team2: { name: 'South Africa', code: 'RSA', score: 0 },
    status: 'FINISHED',
    utcDateString: '2026-06-11T19:00:00.000Z',
    venue: 'Estadio Azteca',
    venueTimeZone: 'America/Mexico_City',
    isOpening: true,
    bookings: [
      { playerName: 'Edson Álvarez', card: 'yellow', teamCode: 'MEX', teamName: 'Mexico' },
      { playerName: 'Thabo Cele', card: 'yellow', teamCode: 'RSA', teamName: 'South Africa' }
    ]
  },
  // Corea del Sur 2-1 República Checa (confirmado FIFA/TYC)
  {
    matchId: 'M002',
    groupId: 'A',
    team1: { name: 'South Korea', code: 'KOR', score: 2 },
    team2: { name: 'Czechia', code: 'CZE', score: 1 },
    status: 'FINISHED',
    utcDateString: '2026-06-11T22:00:00.000Z',
    venue: 'Estadio Akron, Guadalajara',
    venueTimeZone: 'America/Mexico_City',
    isOpening: false,
    bookings: [
      { playerName: 'Lee Jae-sung', card: 'yellow', teamCode: 'KOR', teamName: 'South Korea' },
      { playerName: 'Vladimír Coufal', card: 'yellow', teamCode: 'CZE', teamName: 'Czechia' }
    ]
  },
  // June 12 — Grupo B y D
  // Canadá 1-1 Bosnia y Herzegovina (confirmado FIFA/TYC)
  {
    matchId: 'M003',
    groupId: 'B',
    team1: { name: 'Canada', code: 'CAN', score: 1 },
    team2: { name: 'Bosnia and Herzegovina', code: 'BIH', score: 1 },
    status: 'FINISHED',
    utcDateString: '2026-06-12T19:00:00.000Z',
    venue: 'BMO Field, Toronto',
    venueTimeZone: 'America/Toronto',
    isOpening: false,
    bookings: [
      { playerName: 'Ismaël Koné', card: 'yellow', teamCode: 'CAN', teamName: 'Canada' },
      { playerName: 'Edin Džeko', card: 'yellow', teamCode: 'BIH', teamName: 'Bosnia and Herzegovina' }
    ]
  },
  // USA 4-1 Paraguay (confirmado FIFA/TYC)
  {
    matchId: 'M004',
    groupId: 'D',
    team1: { name: 'USA', code: 'USA', score: 4 },
    team2: { name: 'Paraguay', code: 'PAR', score: 1 },
    status: 'FINISHED',
    utcDateString: '2026-06-12T22:00:00.000Z',
    venue: 'SoFi Stadium, Los Ángeles',
    venueTimeZone: 'America/Los_Angeles',
    isOpening: false,
    bookings: [
      { playerName: 'Christian Pulisic', card: 'yellow', teamCode: 'USA', teamName: 'USA' },
      { playerName: 'Gustavo Gómez', card: 'yellow', teamCode: 'PAR', teamName: 'Paraguay' }
    ]
  },

  // June 13 matches
  {
    matchId: 'M005',
    groupId: 'C',
    team1: { name: 'Haiti', code: 'HAI', score: 0 },
    team2: { name: 'Scotland', code: 'SCO', score: 1 },
    status: 'FINISHED',
    utcDateString: '2026-06-13T16:00:00.000Z',
    venue: 'Gillette Stadium, Boston',
    venueTimeZone: 'America/New_York',
    isOpening: false,
    bookings: [
      { playerName: 'Orelien Dieu', card: 'yellow', teamCode: 'HAI', teamName: 'Haiti' },
      { playerName: 'John McGinn', card: 'yellow', teamCode: 'SCO', teamName: 'Scotland' }
    ]
  },
  // Australia 2-0 Türkiye (confirmado FIFA/TYC)
  {
    matchId: 'M006',
    groupId: 'D',
    team1: { name: 'Australia', code: 'AUS', score: 2 },
    team2: { name: 'Türkiye', code: 'TUR', score: 0 },
    status: 'FINISHED',
    utcDateString: '2026-06-13T19:00:00.000Z',
    venue: 'BC Place, Vancouver',
    venueTimeZone: 'America/Vancouver',
    isOpening: false,
    bookings: [
      { playerName: 'Merih Demiral', card: 'yellow', teamCode: 'TUR', teamName: 'Türkiye' },
      { playerName: 'Çağlar Söyüncü', card: 'yellow', teamCode: 'TUR', teamName: 'Türkiye' }
    ]
  },
  // Brasil 1-1 Marruecos (confirmado FIFA/AS.com)
  {
    matchId: 'M007',
    groupId: 'C',
    team1: { name: 'Brazil', code: 'BRA', score: 1 },
    team2: { name: 'Morocco', code: 'MAR', score: 1 },
    status: 'FINISHED',
    utcDateString: '2026-06-13T22:00:00.000Z',
    venue: 'MetLife Stadium, New York/New Jersey',
    venueTimeZone: 'America/New_York',
    isOpening: false,
    bookings: [
      { playerName: 'Marquinhos', card: 'yellow', teamCode: 'BRA', teamName: 'Brazil' },
      { playerName: 'Sofyan Amrabat', card: 'yellow', teamCode: 'MAR', teamName: 'Morocco' }
    ]
  },
  // Qatar 1-1 Suiza (confirmado FIFA/TYC)
  {
    matchId: 'M008',
    groupId: 'B',
    team1: { name: 'Qatar', code: 'QAT', score: 1 },
    team2: { name: 'Switzerland', code: 'SUI', score: 1 },
    status: 'FINISHED',
    utcDateString: '2026-06-13T23:30:00.000Z',
    venue: "Levi's Stadium, San Francisco",
    venueTimeZone: 'America/Los_Angeles',
    isOpening: false,
    bookings: [
      { playerName: 'Bassam Al-Rawi', card: 'yellow', teamCode: 'QAT', teamName: 'Qatar' },
      { playerName: 'Granit Xhaka', card: 'yellow', teamCode: 'SUI', teamName: 'Switzerland' }
    ]
  },
  // June 14 — Grupos E y F
  // Costa de Marfil 1-0 Ecuador (confirmado FIFA/TYC)
  {
    matchId: 'M009',
    groupId: 'E',
    team1: { name: 'Ivory Coast', code: 'CIV', score: 1 },
    team2: { name: 'Ecuador', code: 'ECU', score: 0 },
    status: 'FINISHED',
    utcDateString: '2026-06-14T16:00:00.000Z',
    venue: 'Lincoln Financial Field, Filadelfia',
    venueTimeZone: 'America/New_York',
    isOpening: false,
    bookings: [
      { playerName: 'Sébastien Haller', card: 'yellow', teamCode: 'CIV', teamName: 'Ivory Coast' },
      { playerName: 'Moisés Caicedo', card: 'yellow', teamCode: 'ECU', teamName: 'Ecuador' }
    ]
  },
  // Alemania 7-1 Curaçao (confirmado FIFA/bolavip)
  {
    matchId: 'M010',
    groupId: 'E',
    team1: { name: 'Germany', code: 'GER', score: 7 },
    team2: { name: 'Curaçao', code: 'CUW', score: 1 },
    status: 'FINISHED',
    utcDateString: '2026-06-14T19:00:00.000Z',
    venue: 'NRG Stadium, Houston',
    venueTimeZone: 'America/Chicago',
    isOpening: false,
    bookings: [
      { playerName: 'Leroy Sané', card: 'yellow', teamCode: 'GER', teamName: 'Germany' }
    ]
  },
  // Países Bajos 2-2 Japón (confirmado FIFA/AS.com)
  {
    matchId: 'M011',
    groupId: 'F',
    team1: { name: 'Netherlands', code: 'NED', score: 2 },
    team2: { name: 'Japan', code: 'JPN', score: 2 },
    status: 'FINISHED',
    utcDateString: '2026-06-14T22:00:00.000Z',
    venue: 'AT&T Stadium, Dallas',
    venueTimeZone: 'America/Chicago',
    isOpening: false,
    bookings: [
      { playerName: 'Virgil van Dijk', card: 'yellow', teamCode: 'NED', teamName: 'Netherlands' },
      { playerName: 'Wataru Endo', card: 'yellow', teamCode: 'JPN', teamName: 'Japan' }
    ]
  },
  // Suecia 5-1 Túnez (confirmado FIFA/Flashscore)
  {
    matchId: 'M012',
    groupId: 'F',
    team1: { name: 'Sweden', code: 'SWE', score: 5 },
    team2: { name: 'Tunisia', code: 'TUN', score: 1 },
    status: 'FINISHED',
    utcDateString: '2026-06-14T23:30:00.000Z',
    venue: 'Estadio BBVA, Monterrey',
    venueTimeZone: 'America/Monterrey',
    isOpening: false,
    bookings: [
      { playerName: 'Hamza Rafia', card: 'yellow', teamCode: 'TUN', teamName: 'Tunisia' },
      { playerName: 'Ellyes Skhiri', card: 'yellow', teamCode: 'TUN', teamName: 'Tunisia' }
    ]
  },

  // June 15 — Grupos G y H (hoy, programados)
  // Bélgica vs. Egipto — Lumen Field, Seattle — 19:00 UTC (FIFA)
  {
    matchId: 'M013',
    groupId: 'G',
    team1: { name: 'Belgium', code: 'BEL', score: null },
    team2: { name: 'Egypt', code: 'EGY', score: null },
    status: 'SCHEDULED',
    utcDateString: '2026-06-15T19:00:00.000Z',
    venue: 'Lumen Field, Seattle',
    venueTimeZone: 'America/Los_Angeles',
    isOpening: false,
    bookings: []
  },
  // Irán vs. Nueva Zelanda — SoFi Stadium, LA — 06:00 UTC 16 Jun (FIFA)
  {
    matchId: 'M014',
    groupId: 'G',
    team1: { name: 'Iran', code: 'IRN', score: null },
    team2: { name: 'New Zealand', code: 'NZL', score: null },
    status: 'SCHEDULED',
    utcDateString: '2026-06-16T06:00:00.000Z',
    venue: 'SoFi Stadium, Los Ángeles',
    venueTimeZone: 'America/Los_Angeles',
    isOpening: false,
    bookings: []
  },
  // España vs. Cabo Verde — AT&T Stadium, Dallas — 16:00 UTC (FIFA)
  {
    matchId: 'M015',
    groupId: 'H',
    team1: { name: 'Spain', code: 'ESP', score: null },
    team2: { name: 'Cabo Verde', code: 'CPV', score: null },
    status: 'SCHEDULED',
    utcDateString: '2026-06-15T16:00:00.000Z',
    venue: 'AT&T Stadium, Dallas',
    venueTimeZone: 'America/Chicago',
    isOpening: false,
    bookings: []
  },
  // Arabia Saudita vs. Uruguay — Hard Rock Stadium, Miami — 23:00 UTC (FIFA)
  {
    matchId: 'M016',
    groupId: 'H',
    team1: { name: 'Saudi Arabia', code: 'KSA', score: null },
    team2: { name: 'Uruguay', code: 'URU', score: null },
    status: 'SCHEDULED',
    utcDateString: '2026-06-15T23:00:00.000Z',
    venue: 'Hard Rock Stadium, Miami',
    venueTimeZone: 'America/New_York',
    isOpening: false,
    bookings: []
  }
];


function writeSchedule() {
  const matches = rawMatches.map(m => {
    const officialDate = m.utcDateString.slice(0, 10);
    return {
      matchId: m.matchId,
      stage: `Fase de Grupos (Grupo ${m.groupId})`,
      groupId: m.groupId,
      team1: m.team1,
      team2: m.team2,
      status: m.status,
      officialDate,
      utcDateString: m.utcDateString,
      venue: m.venue,
      stadium: m.venue,
      venueTimeZone: m.venueTimeZone,
      isOpening: m.isOpening || false,
      kickoffStatus: 'confirmed',
      source: 'official-schedule',
      bookings: m.bookings || [],
      winnerCode: m.winnerCode
    };
  });

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  fs.writeFileSync(TARGET_FILE, `${JSON.stringify(matches, null, 2)}\n`, 'utf8');
  console.log(`Calendario real escrito: ${matches.length} partidos.`);
}

writeSchedule();
