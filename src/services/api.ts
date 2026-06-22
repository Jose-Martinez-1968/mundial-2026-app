import fifaData from '../data/fifaData.json';
import type { Group, MatchDTO } from '../types';
import { validateMatches } from './matchValidation';

const tournamentDataUrl = import.meta.env.VITE_TOURNAMENT_DATA_URL as string | undefined;
const TOURNAMENT_DATA_URL = tournamentDataUrl || '/data/matches.json';
const groups = (fifaData as { groups: Group[] }).groups;

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
      groups,
      matches,
    };
  } catch (error) {
    console.error('Error cargando calendario local:', error);
    return {
      groups,
      matches: [],
    };
  }
};
