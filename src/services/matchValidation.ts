import type { MatchDTO, MatchStatus } from '../types';

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
      hasValidDateShape(value),
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

  return matches;
};
