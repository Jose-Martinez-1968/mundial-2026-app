import fifaData from '../data/fifaData.json';
import type { Group, MatchDTO } from '../types';
import { validateMatches } from './matchValidation';

export const fetchTournamentData = async (): Promise<{ groups: Group[]; matches: MatchDTO[] }> => {
  try {
    const response = await fetch('/data/matches.json');
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
