import type { BookingDTO, MatchDTO, MatchStatus } from '../types';

const MATCH_STATUSES: MatchStatus[] = ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isNullableScore = (value: unknown): value is number | null => {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
};

const isTeamDTO = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  return isString(value.name) && isNullableScore(value.score);
};

const hasValidDateShape = (match: Record<string, unknown>): boolean => {
  if (!isString(match.officialDate)) return false;

  if (match.kickoffStatus === 'date-only') {
    return match.utcDateString === undefined || isString(match.utcDateString);
  }

  return isString(match.utcDateString) && !Number.isNaN(new Date(match.utcDateString).getTime());
};

const normalizeCard = (value: unknown): 'yellow' | 'red' | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');

  if (['yellow', 'yellow-card', 'yc', 'caution'].includes(normalized)) return 'yellow';
  if (['red', 'red-card', 'rc', 'sent-off', 'second-yellow', 'yellow-red', 'second-yellow-card'].includes(normalized)) return 'red';

  return null;
};

const normalizeBooking = (value: unknown): BookingDTO | null => {
  if (!isRecord(value)) return null;
  if (!isString(value.playerName)) return null;

  const card = normalizeCard(value.card);
  if (!card) return null;

  return {
    playerName: value.playerName.trim(),
    ...(typeof value.teamCode === 'string' && value.teamCode.trim() ? { teamCode: value.teamCode.trim() } : {}),
    ...(typeof value.teamName === 'string' && value.teamName.trim() ? { teamName: value.teamName.trim() } : {}),
    card,
  };
};

const hasValidBookings = (value: unknown): boolean => {
  return value === undefined || (Array.isArray(value) && value.every(booking => normalizeBooking(booking) !== null));
};

const hasRealDataSource = (value: unknown): boolean => {
  return value === 'official-schedule' || value === 'live-feed' || value === 'official-api';
};

export const isValidMatchDTO = (value: unknown): value is MatchDTO => {
  if (!isRecord(value)) return false;

  return Boolean(
    isString(value.matchId) &&
      isString(value.stage) &&
      isTeamDTO(value.team1) &&
      isTeamDTO(value.team2) &&
      typeof value.status === 'string' &&
      MATCH_STATUSES.includes(value.status as MatchStatus) &&
      isString(value.venue) &&
      isString(value.venueTimeZone) &&
      hasValidDateShape(value) &&
      hasRealDataSource(value.source) &&
      (value.winnerCode === undefined || typeof value.winnerCode === 'string') &&
      hasValidBookings(value.bookings)
  );
};

export const validateMatches = (value: unknown): MatchDTO[] => {
  if (!Array.isArray(value)) {
    throw new Error('El calendario no es una lista');
  }

  const invalidIndexes: number[] = [];
  const matches = value.filter((item, index): item is MatchDTO => {
    const valid = isValidMatchDTO(item);
    if (!valid) invalidIndexes.push(index);
    return valid;
  });

  if (invalidIndexes.length > 0) {
    throw new Error(`El calendario tiene registros invalidos en indices: ${invalidIndexes.join(', ')}`);
  }

  return matches.map(match => ({
    ...match,
    bookings: match.bookings?.map(booking => normalizeBooking(booking)).filter((booking): booking is NonNullable<typeof booking> => booking !== null),
  }));
};
