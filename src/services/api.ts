import fifaData from '../data/fifaData.json';
import type { Group, MatchDTO } from '../types';
import { validateMatches } from './matchValidation';

const TOURNAMENT_DATA_URL = import.meta.env.VITE_TOURNAMENT_DATA_URL || '/data/matches.json';

const withCacheBuster = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

export const fetchTournamentData = async (): Promise<{ groups: Group[]; matches: MatchDTO[] }> => {
  try {
    const response = await fetch(withCacheBuster(TOURNAMENT_DATA_URL), { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json() as unknown;
    const matches = validateMatches(data);
    return {
      groups: fifaData.groups as Group[],
      matches,
    };
  } catch (error) {
    console.error('Error cargando calendario local:', error);
    return {
      groups: fifaData.groups as Group[],
      matches: [],
    };
  }
};
