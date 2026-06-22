import fifaData from '../../data/fifaData.json';
import type { Group, GroupMatch, KnockoutMatch, Standing, Team } from '../../types';
import {
  calculateNextRoundFromMatches,
  calculateRoundOf32FromStandings,
  calculateStandingsForGroups,
  getBestThirdPlacedTeams,
} from './TournamentCore';

export type { GroupMatch, KnockoutMatch, Standing };

export const calculateStandings = (matches: GroupMatch[], teamsData: Team[] = []): Record<string, Standing[]> => {
  return calculateStandingsForGroups(fifaData.groups as Group[], matches, teamsData);
};

export { getBestThirdPlacedTeams };

export const calculateRoundOf32 = (standings: Record<string, Standing[]>): KnockoutMatch[] => {
  return calculateRoundOf32FromStandings(standings);
};

export const calculateNextRound = (prevRound: KnockoutMatch[], roundPrefix: string): KnockoutMatch[] => {
  return calculateNextRoundFromMatches(prevRound, roundPrefix);
};
