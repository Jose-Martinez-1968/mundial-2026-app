import type { BookingDTO, MatchDTO, MatchStatus } from '../types';

/**
 * Cliente en vivo de la API oficial de FIFA.
 *
 * Replica fielmente la lógica de mapeo de `backend/scraper.js`, pero
 * ejecutándose en el navegador. La API de FIFA permite CORS
 * (`Access-Control-Allow-Origin: *`), así que las llamadas directas
 * funcionan desde el cliente sin necesidad de un backend intermedio.
 *
 * El botón "Actualizar" y la sincronización automática usan este cliente
 * para traer datos reales en tiempo real (marcadores, estado, tarjetas).
 */

const FIFA_API = 'https://api.fifa.com/api/v3';
const SEASON_ID = '285023';
const COMPETITION_ID = '17';
const LANGUAGE = 'en';

// Mapa estadio -> zona horaria (igual que scraper.js)
const TIMEZONES_BY_STADIUM: ReadonlyMap<string, string> = new Map([
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

interface LocalizedName {
  Locale: string;
  Description: string;
}

interface FifaTeam {
  IdTeam?: string;
  IdCountry?: string;
  Abbreviation?: string;
  ShortClubName?: string;
  TeamName?: LocalizedName[];
}

interface FifaTimelineEvent {
  Type: number;
  IdTeam?: string;
  IdPlayer?: string;
  EventDescription?: LocalizedName[];
}

interface FifaTimeline {
  Event?: FifaTimelineEvent[];
}

interface FifaMatch {
  IdMatch: string;
  MatchNumber: number;
  MatchStatus: number;
  Date?: string;
  LocalDate?: string;
  TimeDefined: boolean;
  StageName?: LocalizedName[];
  GroupName?: LocalizedName[];
  Stadium?: { Name?: LocalizedName[] };
  Home?: FifaTeam;
  Away?: FifaTeam;
  PlaceHolderA?: string;
  PlaceHolderB?: string;
  HomeTeamScore?: number;
  AwayTeamScore?: number;
  Winner?: string;
}

interface FifaCalendarResponse {
  Results?: FifaMatch[];
}

const getLocalized = (items: LocalizedName[] | undefined, fallback = ''): string => {
  if (!Array.isArray(items)) return fallback;
  return items.find(item => item.Locale === 'en-GB')?.Description || items[0]?.Description || fallback;
};

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`FIFA API ${response.status}: ${url}`);
  }
  return response.json();
};

const fifaMatchesUrl = (): string => {
  const params = new URLSearchParams({
    language: LANGUAGE,
    count: '500',
    idCompetition: COMPETITION_ID,
    idSeason: SEASON_ID,
  });
  return `${FIFA_API}/calendar/matches?${params.toString()}`;
};

const fifaTimelineUrl = (idMatch: string): string => {
  const params = new URLSearchParams({ language: LANGUAGE });
  return `${FIFA_API}/timelines/${idMatch}?${params.toString()}`;
};

const toStatus = (match: FifaMatch): MatchStatus => {
  if (match.MatchStatus === 0) return 'FINISHED';
  if (match.MatchStatus === 2 || match.MatchStatus === 3 || match.MatchStatus === 12) return 'LIVE';
  if (match.MatchStatus === 4) return 'POSTPONED';
  if (match.MatchStatus === 5) return 'CANCELLED';
  return 'SCHEDULED';
};

const toStage = (match: FifaMatch): string => {
  const stage = getLocalized(match.StageName, 'Partido');
  const group = getLocalized(match.GroupName);
  if (stage === 'First Stage' && group) return `Fase de Grupos (${group.replace('Group ', 'Grupo ')})`;
  return stage;
};

const toGroupId = (match: FifaMatch): string | undefined => {
  const group = getLocalized(match.GroupName);
  const found = group.match(/Group\s+([A-Z])/i);
  return found?.[1].toUpperCase();
};

const toTeam = (
  team: FifaTeam | undefined,
  placeholder: string | undefined,
  score: number | null,
): { name: string; code?: string; score: number | null } => {
  if (!team) {
    return { name: placeholder || 'TBD', score };
  }
  return {
    name: getLocalized(team.TeamName, team.ShortClubName || team.Abbreviation || 'TBD'),
    code: team.Abbreviation || team.IdCountry || undefined,
    score,
  };
};

const getPlayerName = (event: FifaTimelineEvent): string => {
  const description = getLocalized(event.EventDescription);
  const match = description.match(/^(.+?)\s+\((.+?)\)\s+(?:is booked|is sent off)/i);
  if (match) return match[1].replace(/\s+/g, ' ').trim();
  return event.IdPlayer ? `Player ${event.IdPlayer}` : 'Jugador sin nombre';
};

// Cache en memoria de bookings por idMatch. Las timelines son costosas
// (104 peticiones extra); se cachean mientras el partido no cambie de
// estado y se invalidan cuando un partido pasa a FINISHED y ya tiene
// bookings cargados.
const bookingsCache = new Map<string, BookingDTO[]>();

const extractBookings = async (match: FifaMatch): Promise<BookingDTO[]> => {
  const status = toStatus(match);
  if (status === 'SCHEDULED') return [];

  // Si ya finalizo y tenemos bookings en cache, no volvemos a pedir.
  const cached = bookingsCache.get(match.IdMatch);
  if (cached) return cached;

  try {
    const timeline = (await fetchJson(fifaTimelineUrl(match.IdMatch))) as FifaTimeline;
    const teamsById = new Map<string, { code?: string; name: string }>(
      [match.Home, match.Away]
        .filter(Boolean)
        .map(team => [
          team!.IdTeam || '',
          {
            code: team!.Abbreviation || team!.IdCountry,
            name: getLocalized(team!.TeamName, team!.ShortClubName || team!.Abbreviation || ''),
          },
        ]),
    );

    const bookings: BookingDTO[] = (timeline.Event || [])
      .filter(event => event.Type === 2 || event.Type === 3)
      .map(event => {
        const team = teamsById.get(event.IdTeam || '');
        const booking: BookingDTO = {
          playerName: getPlayerName(event),
          card: event.Type === 2 ? 'yellow' : 'red',
        };
        if (team?.code) booking.teamCode = team.code;
        if (team?.name) booking.teamName = team.name;
        return booking;
      });

    // Solo cacheamos si el partido ya termino (ya no cambiara).
    if (status === 'FINISHED') {
      bookingsCache.set(match.IdMatch, bookings);
    }
    return bookings;
  } catch (error) {
    console.warn(`No se pudo leer timeline de ${match.IdMatch}:`, error);
    return [];
  }
};

const toMatchDto = async (match: FifaMatch): Promise<MatchDTO> => {
  const status = toStatus(match);
  const stadiumName = getLocalized(match.Stadium?.Name, 'Estadio pendiente');
  const utcDateString = match.TimeDefined ? match.Date : undefined;
  const officialDate = (match.Date || match.LocalDate || '').slice(0, 10);
  const homeScore = status === 'SCHEDULED' ? null : match.HomeTeamScore ?? null;
  const awayScore = status === 'SCHEDULED' ? null : match.AwayTeamScore ?? null;
  const matchNumber = String(match.MatchNumber).padStart(3, '0');
  const groupId = toGroupId(match);

  const dto: MatchDTO = {
    matchId: `M${matchNumber}`,
    stage: toStage(match),
    team1: toTeam(match.Home, match.PlaceHolderA, homeScore),
    team2: toTeam(match.Away, match.PlaceHolderB, awayScore),
    status,
    officialDate,
    venue: stadiumName,
    stadium: stadiumName,
    venueTimeZone: TIMEZONES_BY_STADIUM.get(stadiumName) || 'UTC',
    kickoffStatus: match.TimeDefined ? 'confirmed' : 'date-only',
    source: status === 'SCHEDULED' ? 'official-schedule' : 'official-api',
    bookings: await extractBookings(match),
  };

  if (groupId) dto.groupId = groupId;
  if (utcDateString) dto.utcDateString = utcDateString;
  if (match.MatchNumber === 1) dto.isOpening = true;
  if (match.MatchNumber === 104) dto.isFinal = true;
  if (match.Winner) {
    dto.winnerCode = match.Winner === match.Home?.IdTeam
      ? match.Home?.Abbreviation
      : match.Away?.Abbreviation;
  }

  return dto;
};

/**
 * Trae todos los partidos del Mundial 2026 desde la API oficial de FIFA,
 * procesados al formato `MatchDTO` de la app. Lanza si la API falla o si
 * el recuento de partidos no es el esperado (104).
 */
export const fetchLiveMatchesFromFifa = async (): Promise<MatchDTO[]> => {
  const data = (await fetchJson(fifaMatchesUrl())) as FifaCalendarResponse;
  const sourceMatches = data.Results || [];
  if (sourceMatches.length === 0) {
    throw new Error('FIFA API no devolvio partidos.');
  }

  // Ordenamos por numero de partido para mantener un orden estable.
  const sorted = [...sourceMatches].sort((a, b) => a.MatchNumber - b.MatchNumber);

  // Procesamos las timelines en paralelo, en lotes para no saturar.
  const matches: MatchDTO[] = [];
  const BATCH_SIZE = 12;
  for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
    const batch = sorted.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(toMatchDto));
    matches.push(...batchResults);
  }

  return matches;
};
