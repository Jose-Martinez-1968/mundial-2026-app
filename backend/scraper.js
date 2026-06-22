import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.join(__dirname, '..', 'public', 'data');
const TARGET_FILE = path.join(TARGET_DIR, 'matches.json');

const FIFA_API = 'https://api.fifa.com/api/v3';
const SEASON_ID = '285023';
const COMPETITION_ID = '17';
const LANGUAGE = 'en';

const TIMEZONES_BY_STADIUM = new Map([
  ['Mexico City Stadium', 'America/Mexico_City'],
  ['Guadalajara Stadium', 'America/Mexico_City'],
  ['Monterrey Stadium', 'America/Monterrey'],
  ['Toronto Stadium', 'America/Toronto'],
  ['Vancouver Stadium', 'America/Vancouver'],
  ['BC Place Vancouver', 'America/Vancouver'],
  ['Los Angeles Stadium', 'America/Los_Angeles'],
  ['San Francisco Bay Area Stadium', 'America/Los_Angeles'],
  ['Seattle Stadium', 'America/Los_Angeles'],
  ['Dallas Stadium', 'America/Chicago'],
  ['Houston Stadium', 'America/Chicago'],
  ['Kansas City Stadium', 'America/Chicago'],
  ['Atlanta Stadium', 'America/New_York'],
  ['Boston Stadium', 'America/New_York'],
  ['Miami Stadium', 'America/New_York'],
  ['New York/New Jersey Stadium', 'America/New_York'],
  ['Philadelphia Stadium', 'America/New_York'],
]);

const getLocalized = (items, fallback = '') => {
  if (!Array.isArray(items)) return fallback;
  return items.find(item => item.Locale === 'en-GB')?.Description || items[0]?.Description || fallback;
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'mundial-2026-app-data-sync/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`FIFA API ${response.status}: ${url}`);
  }

  return response.json();
};

const fifaMatchesUrl = () => {
  const params = new URLSearchParams({
    language: LANGUAGE,
    count: '500',
    idCompetition: COMPETITION_ID,
    idSeason: SEASON_ID,
  });
  return `${FIFA_API}/calendar/matches?${params.toString()}`;
};

const fifaTimelineUrl = (idMatch) => {
  const params = new URLSearchParams({ language: LANGUAGE });
  return `${FIFA_API}/timelines/${idMatch}?${params.toString()}`;
};

const toStatus = (match) => {
  if (match.MatchStatus === 0) return 'FINISHED';
  if (match.MatchStatus === 2 || match.MatchStatus === 3 || match.MatchStatus === 12) return 'LIVE';
  if (match.MatchStatus === 4) return 'POSTPONED';
  if (match.MatchStatus === 5) return 'CANCELLED';
  return 'SCHEDULED';
};

const toStage = (match) => {
  const stage = getLocalized(match.StageName, 'Partido');
  const group = getLocalized(match.GroupName);
  if (stage === 'First Stage' && group) return `Fase de Grupos (${group.replace('Group ', 'Grupo ')})`;
  return stage;
};

const toGroupId = (match) => {
  const group = getLocalized(match.GroupName);
  const found = group.match(/Group\s+([A-Z])/i);
  return found?.[1].toUpperCase();
};

const toTeam = (team, placeholder, score) => {
  if (!team) {
    return {
      name: placeholder || 'TBD',
      score,
    };
  }

  return {
    name: getLocalized(team.TeamName, team.ShortClubName || team.Abbreviation || 'TBD'),
    code: team.Abbreviation || team.IdCountry || undefined,
    score,
  };
};

const getPlayerName = (event) => {
  const description = getLocalized(event.EventDescription);
  const match = description.match(/^(.+?)\s+\((.+?)\)\s+(?:is booked|is sent off)/i);
  if (match) return match[1].replace(/\s+/g, ' ').trim();
  return event.IdPlayer ? `Player ${event.IdPlayer}` : 'Jugador sin nombre';
};

const extractBookings = async (match) => {
  if (toStatus(match) === 'SCHEDULED') return [];

  try {
    const timeline = await fetchJson(fifaTimelineUrl(match.IdMatch));
    const teamsById = new Map(
      [match.Home, match.Away]
        .filter(Boolean)
        .map(team => [
          team.IdTeam,
          {
            code: team.Abbreviation || team.IdCountry,
            name: getLocalized(team.TeamName, team.ShortClubName || team.Abbreviation),
          },
        ]),
    );

    return (timeline.Event || [])
      .filter(event => event.Type === 2 || event.Type === 3)
      .map(event => {
        const team = teamsById.get(event.IdTeam) || {};
        return {
          playerName: getPlayerName(event),
          card: event.Type === 2 ? 'yellow' : 'red',
          ...(team.code ? { teamCode: team.code } : {}),
          ...(team.name ? { teamName: team.name } : {}),
        };
      });
  } catch (error) {
    console.warn(`No se pudo leer timeline de ${match.IdMatch}: ${error.message}`);
    return [];
  }
};

const toMatchDto = async (match) => {
  const status = toStatus(match);
  const stadiumName = getLocalized(match.Stadium?.Name, 'Estadio pendiente');
  const utcDateString = match.TimeDefined ? match.Date : undefined;
  const officialDate = (match.Date || match.LocalDate || '').slice(0, 10);
  const homeScore = status === 'SCHEDULED' ? null : match.HomeTeamScore;
  const awayScore = status === 'SCHEDULED' ? null : match.AwayTeamScore;
  const matchNumber = String(match.MatchNumber).padStart(3, '0');

  return {
    matchId: `M${matchNumber}`,
    fifaMatchId: match.IdMatch,
    stage: toStage(match),
    ...(toGroupId(match) ? { groupId: toGroupId(match) } : {}),
    team1: toTeam(match.Home, match.PlaceHolderA, homeScore),
    team2: toTeam(match.Away, match.PlaceHolderB, awayScore),
    status,
    ...(utcDateString ? { utcDateString } : {}),
    officialDate,
    venue: stadiumName,
    stadium: stadiumName,
    venueTimeZone: TIMEZONES_BY_STADIUM.get(stadiumName) || 'UTC',
    ...(match.MatchNumber === 1 ? { isOpening: true } : {}),
    ...(match.MatchNumber === 104 ? { isFinal: true } : {}),
    kickoffStatus: match.TimeDefined ? 'confirmed' : 'date-only',
    source: status === 'SCHEDULED' ? 'official-schedule' : 'official-api',
    ...(match.Winner ? { winnerCode: match.Winner === match.Home?.IdTeam ? match.Home?.Abbreviation : match.Away?.Abbreviation } : {}),
    bookings: await extractBookings(match),
  };
};

const main = async () => {
  const data = await fetchJson(fifaMatchesUrl());
  const sourceMatches = data.Results || [];
  if (sourceMatches.length !== 104) {
    throw new Error(`FIFA API devolvio ${sourceMatches.length} partidos; se esperaban 104.`);
  }

  const matches = [];
  for (const match of sourceMatches.sort((a, b) => a.MatchNumber - b.MatchNumber)) {
    matches.push(await toMatchDto(match));
  }

  fs.mkdirSync(TARGET_DIR, { recursive: true });
  fs.writeFileSync(TARGET_FILE, `${JSON.stringify(matches, null, 2)}\n`, 'utf8');

  const finished = matches.filter(match => match.status === 'FINISHED').length;
  const yellowCards = matches.flatMap(match => match.bookings).filter(card => card.card === 'yellow').length;
  const redCards = matches.flatMap(match => match.bookings).filter(card => card.card === 'red').length;

  console.log(`Calendario oficial FIFA escrito: ${matches.length} partidos.`);
  console.log(`Finalizados: ${finished}. Amarillas: ${yellowCards}. Rojas: ${redCards}.`);
  console.log(`Fuente: ${fifaMatchesUrl()}`);
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
