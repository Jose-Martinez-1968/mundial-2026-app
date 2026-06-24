import type { Group, GroupMatch, KnockoutMatch, Standing, Team } from '../../types';

export const GROUPS_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const THIRD_PLACE_ROUND_OF_32_SLOTS = [
  { matchId: 'R32-2', allowedGroups: ['A', 'B', 'C', 'D', 'F'] },
  { matchId: 'R32-5', allowedGroups: ['C', 'D', 'F', 'G', 'H'] },
  { matchId: 'R32-7', allowedGroups: ['C', 'E', 'F', 'H', 'I'] },
  { matchId: 'R32-8', allowedGroups: ['E', 'H', 'I', 'J', 'K'] },
  { matchId: 'R32-9', allowedGroups: ['B', 'E', 'F', 'I', 'J'] },
  { matchId: 'R32-10', allowedGroups: ['A', 'E', 'H', 'I', 'J'] },
  { matchId: 'R32-13', allowedGroups: ['E', 'F', 'G', 'I', 'J'] },
  { matchId: 'R32-15', allowedGroups: ['D', 'E', 'I', 'J', 'L'] },
] as const;

const getFairPlayScore = (team: Team): number => {
  return (team.players || []).reduce((score, player) => {
    return score - player.yellowCards - player.redCards * 4;
  }, 0);
};

export const compareStandings = (a: Standing, b: Standing): number => {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  if (b.won !== a.won) return b.won - a.won;
  if (b.fairPlay !== a.fairPlay) return b.fairPlay - a.fairPlay;
  return (a.ranking || 999) - (b.ranking || 999);
};

const createMiniStanding = (team: Standing): Standing => ({
  ...team,
  points: 0,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
});

const applyMatchToStandings = (home: Standing, away: Standing, homeScore: number, awayScore: number) => {
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeScore;
  away.goalsFor += awayScore;
  home.goalsAgainst += awayScore;
  away.goalsAgainst += homeScore;
  home.goalDifference = home.goalsFor - home.goalsAgainst;
  away.goalDifference = away.goalsFor - away.goalsAgainst;

  if (homeScore > awayScore) {
    home.wins += 1;
    home.won += 1;
    home.points += 3;
    away.losses += 1;
    away.lost += 1;
  } else if (homeScore < awayScore) {
    away.wins += 1;
    away.won += 1;
    away.points += 3;
    home.losses += 1;
    home.lost += 1;
  } else {
    home.draws += 1;
    away.draws += 1;
    home.drawn += 1;
    away.drawn += 1;
    home.points += 1;
    away.points += 1;
  }
};

const compareOverallFallback = (a: Standing, b: Standing): number => {
  if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  if (b.fairPlay !== a.fairPlay) return b.fairPlay - a.fairPlay;
  return (a.ranking || 999) - (b.ranking || 999);
};

const resolvePointTie = (teams: Standing[], groupMatches: GroupMatch[]): Standing[] => {
  if (teams.length <= 1) return teams;

  const teamCodes = new Set(teams.map(team => team.code));
  const miniTable = new Map(teams.map(team => [team.code, createMiniStanding(team)]));

  groupMatches.forEach(match => {
    if (match.homeScore === null || match.awayScore === null) return;
    if (!teamCodes.has(match.homeTeam.code) || !teamCodes.has(match.awayTeam.code)) return;

    const home = miniTable.get(match.homeTeam.code);
    const away = miniTable.get(match.awayTeam.code);
    if (!home || !away) return;
    applyMatchToStandings(home, away, match.homeScore, match.awayScore);
  });

  const groupedByMini = new Map<string, Standing[]>();
  teams.forEach(team => {
    const mini = miniTable.get(team.code);
    const key = `${mini?.points ?? 0}|${mini?.goalDifference ?? 0}|${mini?.goalsFor ?? 0}`;
    const bucket = groupedByMini.get(key) || [];
    bucket.push(team);
    groupedByMini.set(key, bucket);
  });

  return [...teams]
    .sort((a, b) => {
      const miniA = miniTable.get(a.code);
      const miniB = miniTable.get(b.code);
      if (!miniA || !miniB) return compareOverallFallback(a, b);
      if (miniB.points !== miniA.points) return miniB.points - miniA.points;
      if (miniB.goalDifference !== miniA.goalDifference) return miniB.goalDifference - miniA.goalDifference;
      if (miniB.goalsFor !== miniA.goalsFor) return miniB.goalsFor - miniA.goalsFor;
      return compareOverallFallback(a, b);
    })
    .sort((a, b) => {
      const miniA = miniTable.get(a.code);
      const miniB = miniTable.get(b.code);
      const keyA = `${miniA?.points ?? 0}|${miniA?.goalDifference ?? 0}|${miniA?.goalsFor ?? 0}`;
      const keyB = `${miniB?.points ?? 0}|${miniB?.goalDifference ?? 0}|${miniB?.goalsFor ?? 0}`;
      if (keyA !== keyB) {
        if ((miniB?.points ?? 0) !== (miniA?.points ?? 0)) return (miniB?.points ?? 0) - (miniA?.points ?? 0);
        if ((miniB?.goalDifference ?? 0) !== (miniA?.goalDifference ?? 0)) return (miniB?.goalDifference ?? 0) - (miniA?.goalDifference ?? 0);
        return (miniB?.goalsFor ?? 0) - (miniA?.goalsFor ?? 0);
      }
      return compareOverallFallback(a, b);
    });
};

const rankGroupStandings = (groupStandings: Standing[], groupMatches: GroupMatch[]): Standing[] => {
  const buckets = new Map<number, Standing[]>();
  groupStandings.forEach(team => {
    const bucket = buckets.get(team.points) || [];
    bucket.push(team);
    buckets.set(team.points, bucket);
  });

  return [...buckets.keys()]
    .sort((a, b) => b - a)
    .flatMap(points => resolvePointTie(buckets.get(points) || [], groupMatches));
};

const assignThirdPlaceTeams = (thirdPlaceTeams: Standing[]): Map<string, Standing> => {
  const orderedTeams = [...thirdPlaceTeams].sort((a, b) => a.groupId.localeCompare(b.groupId));

  const backtrack = (
    slotIndex: number,
    remainingTeams: Standing[],
    assignments: Map<string, Standing>,
  ): Map<string, Standing> | null => {
    if (slotIndex === THIRD_PLACE_ROUND_OF_32_SLOTS.length) {
      return assignments;
    }

    const slot = THIRD_PLACE_ROUND_OF_32_SLOTS[slotIndex];
    const candidates = remainingTeams.filter(team => (slot.allowedGroups as readonly string[]).includes(team.groupId));

    for (const candidate of candidates) {
      const nextAssignments = new Map(assignments);
      nextAssignments.set(slot.matchId, candidate);
      const nextRemaining = remainingTeams.filter(team => team.code !== candidate.code);
      const resolved = backtrack(slotIndex + 1, nextRemaining, nextAssignments);
      if (resolved) return resolved;
    }

    return null;
  };

  return backtrack(0, orderedTeams, new Map<string, Standing>()) || new Map<string, Standing>();
};

export const calculateStandingsForGroups = (
  groups: Group[],
  matches: GroupMatch[],
  teamsData: Team[] = [],
): Record<string, Standing[]> => {
  const teamInfo = new Map(teamsData.map(team => [team.code, team]));
  const standings: Record<string, Standing[]> = {};

  groups.forEach(group => {
    const groupStandings: Record<string, Standing> = {};

    group.teams.forEach(team => {
      const enrichedTeam = teamInfo.get(team.code) || team;
      groupStandings[team.code] = {
        ...enrichedTeam,
        teamId: team.code,
        teamName: team.name,
        groupId: group.id,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        fairPlay: getFairPlayScore(enrichedTeam),
      };
    });

    matches
      .filter(match => match.groupId === group.id)
      .forEach(match => {
        if (match.homeScore === null || match.awayScore === null) return;

        const home = groupStandings[match.homeTeam.code];
        const away = groupStandings[match.awayTeam.code];
        if (!home || !away) return;

        applyMatchToStandings(home, away, match.homeScore, match.awayScore);
      });

    standings[group.id] = rankGroupStandings(
      Object.values(groupStandings),
      matches.filter(match => match.groupId === group.id),
    );
  });

  return standings;
};

export const getBestThirdPlacedTeams = (standings: Record<string, Standing[]>): Standing[] => {
  // Collect the 3rd-placed team from every group that has at least one team
  // with played > 0 (i.e. partial or complete results).  Teams with 0 matches
  // played are still included so the table shows all 12 third-placed slots
  // from the start, ranked by the live data.
  return GROUPS_ORDER
    .map(groupId => standings[groupId]?.[2])
    .filter((team): team is Standing => Boolean(team))
    .sort(compareStandings);
};

export const calculateRoundOf32FromStandings = (standings: Record<string, Standing[]>): KnockoutMatch[] => {
  // getBestThirdPlacedTeams now returns all 12 (for the live-ranking UI).
  // For bracket generation we still need only the top 8 completed teams.
  const allThirds = getBestThirdPlacedTeams(standings);
  const bestThirds = allThirds
    .filter(team => team.played === 3)
    .slice(0, 8);
  const thirdAssignments = assignThirdPlaceTeams(bestThirds);
  const matches: KnockoutMatch[] = [];

  const getTeamIfCompleted = (groupId: string, index: number): Standing | null => {
    const groupTeams = standings[groupId];
    const completed = groupTeams && groupTeams.length === 4 && groupTeams.every(t => t.played === 3);
    return completed ? groupTeams[index] : null;
  };

  matches.push({ id: 'R32-1', home: getTeamIfCompleted('A', 1), away: getTeamIfCompleted('B', 1) });
  matches.push({ id: 'R32-2', home: getTeamIfCompleted('E', 0), away: thirdAssignments.get('R32-2') || null });
  matches.push({ id: 'R32-3', home: getTeamIfCompleted('F', 0), away: getTeamIfCompleted('C', 1) });
  matches.push({ id: 'R32-4', home: getTeamIfCompleted('C', 0), away: getTeamIfCompleted('F', 1) });
  matches.push({ id: 'R32-5', home: getTeamIfCompleted('I', 0), away: thirdAssignments.get('R32-5') || null });
  matches.push({ id: 'R32-6', home: getTeamIfCompleted('E', 1), away: getTeamIfCompleted('I', 1) });
  matches.push({ id: 'R32-7', home: getTeamIfCompleted('A', 0), away: thirdAssignments.get('R32-7') || null });
  matches.push({ id: 'R32-8', home: getTeamIfCompleted('L', 0), away: thirdAssignments.get('R32-8') || null });
  matches.push({ id: 'R32-9', home: getTeamIfCompleted('D', 0), away: thirdAssignments.get('R32-9') || null });
  matches.push({ id: 'R32-10', home: getTeamIfCompleted('G', 0), away: thirdAssignments.get('R32-10') || null });
  matches.push({ id: 'R32-11', home: getTeamIfCompleted('K', 1), away: getTeamIfCompleted('L', 1) });
  matches.push({ id: 'R32-12', home: getTeamIfCompleted('H', 0), away: getTeamIfCompleted('J', 1) });
  matches.push({ id: 'R32-13', home: getTeamIfCompleted('B', 0), away: thirdAssignments.get('R32-13') || null });
  matches.push({ id: 'R32-14', home: getTeamIfCompleted('J', 0), away: getTeamIfCompleted('H', 1) });
  matches.push({ id: 'R32-15', home: getTeamIfCompleted('K', 0), away: thirdAssignments.get('R32-15') || null });
  matches.push({ id: 'R32-16', home: getTeamIfCompleted('D', 1), away: getTeamIfCompleted('G', 1) });

  return matches;
};

const getWinner = (match: KnockoutMatch | undefined): Standing | null => {
  if (!match) return null;
  if (match.winner) return match.winner;
  if (match.homeScore === null || match.homeScore === undefined) return null;
  if (match.awayScore === null || match.awayScore === undefined) return null;
  if (match.homeScore > match.awayScore) return match.home;
  if (match.awayScore > match.homeScore) return match.away;
  return null;
};

export const calculateNextRoundFromMatches = (prevRound: KnockoutMatch[], roundPrefix: string): KnockoutMatch[] => {
  const matches: KnockoutMatch[] = [];

  for (let i = 0; i < prevRound.length; i += 2) {
    matches.push({
      id: `${roundPrefix}-${matches.length + 1}`,
      home: getWinner(prevRound[i]),
      away: getWinner(prevRound[i + 1]),
    });
  }

  return matches;
};
