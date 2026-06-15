/**
 * Real Data Service - Sync with FIFA World Cup 2026 Official APIs
 * Uses GitHub worldcup2026 API and WhenIsKickoff as fallback
 * No API key required - both APIs are free and public
 */

import type { MatchDTO, Standing } from '../types';

interface GitHubMatch {
  id: string;
  home_team: {
    code: string;
    name: string;
  };
  away_team: {
    code: string;
    name: string;
  };
  home_score: number | null;
  away_score: number | null;
  status: string;
  stage: string;
  group?: string;
  datetime: string;
  venue?: {
    name: string;
    city: string;
    timezone?: string;
  };
}

interface WhenIsKickoffMatch {
  num: number;
  date: string;
  time_utc: string;
  home: string;
  home_name: string;
  away: string;
  away_name: string;
  group?: string;
  phase: string;
  venue: string;
  venue_name: string;
  venue_city: string;
}

const GITHUB_API_BASE = 'https://api.github.com/repos/rezarahiminia/worldcup2026/contents/data';
const WHENISKICKOFF_API_BASE = 'https://wheniskickoff.com/data/v1';

/**
 * Fetch real match data from GitHub worldcup2026 API
 */
export const fetchRealMatchesFromGitHub = async (): Promise<GitHubMatch[]> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/matches.json`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    const data = await response.json() as { content?: string };
    if (!data.content) throw new Error('No content in GitHub response');

    // GitHub returns base64 encoded content
    const decodedContent = atob(data.content);
    const matches: GitHubMatch[] = JSON.parse(decodedContent);

    return matches;
  } catch (error) {
    console.error('Error fetching from GitHub worldcup2026 API:', error);
    return [];
  }
};

/**
 * Fetch real match data from WhenIsKickoff API (faster, no encoding)
 */
export const fetchRealMatchesFromWhenIsKickoff = async (): Promise<WhenIsKickoffMatch[]> => {
  try {
    const response = await fetch(`${WHENISKICKOFF_API_BASE}/matches.json`);
    if (!response.ok) throw new Error(`WhenIsKickoff API error: ${response.status}`);

    const matches: WhenIsKickoffMatch[] = await response.json();
    return matches;
  } catch (error) {
    console.error('Error fetching from WhenIsKickoff API:', error);
    return [];
  }
};

/**
 * Convert GitHub match format to app MatchDTO format
 */
const convertGitHubMatchToDTO = (match: GitHubMatch): MatchDTO => {
  // Parse datetime
  const [date, time] = match.datetime.split(' ');
  const utcDateString = `${date}T${time}:00Z`;

  return {
    matchId: match.id,
    stage: match.stage,
    groupId: match.group,
    team1: {
      name: match.home_team.name,
      code: match.home_team.code,
      score: match.home_score,
    },
    team2: {
      name: match.away_team.name,
      code: match.away_team.code,
      score: match.away_score,
    },
    status: mapGitHubStatus(match.status),
    utcDateString,
    officialDate: date,
    venue: match.venue?.name || 'TBD',
    stadium: match.venue?.name,
    venueTimeZone: match.venue?.timezone || 'America/New_York',
    kickoffStatus: 'confirmed',
    source: 'official-schedule',
  };
};

/**
 * Convert WhenIsKickoff match format to app MatchDTO format
 */
const convertWhenIsKickoffMatchToDTO = (match: WhenIsKickoffMatch): MatchDTO => {
  const utcDateString = `${match.date}T${match.time_utc}:00Z`;

  return {
    matchId: `${match.num}`,
    stage: match.phase === 'group' ? 'Group Stage' : match.phase.toUpperCase(),
    groupId: match.group,
    team1: {
      name: match.home_name,
      code: match.home,
      score: null,
    },
    team2: {
      name: match.away_name,
      code: match.away,
      score: null,
    },
    status: 'SCHEDULED',
    utcDateString,
    officialDate: match.date,
    venue: match.venue_name,
    stadium: match.venue_name,
    venueTimeZone: 'America/New_York', // Default, can be enhanced
    kickoffStatus: 'confirmed',
    source: 'official-schedule',
  };
};

/**
 * Map GitHub match status to app status
 */
const mapGitHubStatus = (status: string): 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' => {
  const statusMap: Record<string, 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'> = {
    not_started: 'SCHEDULED',
    first_half: 'LIVE',
    half_time: 'LIVE',
    second_half: 'LIVE',
    finished: 'FINISHED',
    postponed: 'POSTPONED',
    cancelled: 'CANCELLED',
  };

  return statusMap[status] || 'SCHEDULED';
};

/**
 * Get real match data - tries multiple sources
 * Priority: GitHub > WhenIsKickoff
 */
export const getRealMatchData = async (): Promise<MatchDTO[]> => {
  // Try GitHub first
  const githubMatches = await fetchRealMatchesFromGitHub();
  if (githubMatches.length > 0) {
    return githubMatches.map(convertGitHubMatchToDTO);
  }

  // Fallback to WhenIsKickoff
  const whenIsKickoffMatches = await fetchRealMatchesFromWhenIsKickoff();
  if (whenIsKickoffMatches.length > 0) {
    return whenIsKickoffMatches.map(convertWhenIsKickoffMatchToDTO);
  }

  // If both fail, return empty array
  console.warn('Could not fetch real match data from any source');
  return [];
};

/**
 * Check if device has internet connection
 */
export const checkInternetConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return response.ok || response.type === 'opaque';
  } catch {
    return false;
  }
};

/**
 * Get real standings/group data
 * Calculates from match results
 */
export const calculateRealStandings = (matches: MatchDTO[]): Record<string, Standing[]> => {
  const standings: Record<string, Standing[]> = {};

  // Initialize groups
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  groups.forEach(group => {
    standings[group] = [];
  });

  // Process each match
  matches.forEach(match => {
    if (!match.groupId || match.team1.score === null || match.team2.score === null) return;

    const groupId = match.groupId;
    const homeTeamCode = match.team1.code || '';
    const awayTeamCode = match.team2.code || '';
    const homeScore = match.team1.score;
    const awayScore = match.team2.score;

    // Update or create home team standing
    let homeTeamStanding = standings[groupId].find(t => t.code === homeTeamCode);
    if (!homeTeamStanding) {
      homeTeamStanding = {
        teamId: homeTeamCode,
        teamName: match.team1.name,
        name: match.team1.name,
        code: homeTeamCode,
        flag: '',
        continent: '',
        seed: false,
        groupId,
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
        fairPlay: 0,
      };
      standings[groupId].push(homeTeamStanding);
    }

    // Update or create away team standing
    let awayTeamStanding = standings[groupId].find(t => t.code === awayTeamCode);
    if (!awayTeamStanding) {
      awayTeamStanding = {
        teamId: awayTeamCode,
        teamName: match.team2.name,
        name: match.team2.name,
        code: awayTeamCode,
        flag: '',
        continent: '',
        seed: false,
        groupId,
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
        fairPlay: 0,
      };
      standings[groupId].push(awayTeamStanding);
    }

    // Update stats
    homeTeamStanding.played += 1;
    awayTeamStanding.played += 1;
    homeTeamStanding.goalsFor += homeScore;
    homeTeamStanding.goalsAgainst += awayScore;
    awayTeamStanding.goalsFor += awayScore;
    awayTeamStanding.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeTeamStanding.wins += 1;
      homeTeamStanding.won += 1;
      homeTeamStanding.points += 3;
      awayTeamStanding.losses += 1;
      awayTeamStanding.lost += 1;
    } else if (awayScore > homeScore) {
      awayTeamStanding.wins += 1;
      awayTeamStanding.won += 1;
      awayTeamStanding.points += 3;
      homeTeamStanding.losses += 1;
      homeTeamStanding.lost += 1;
    } else {
      homeTeamStanding.draws += 1;
      homeTeamStanding.drawn += 1;
      homeTeamStanding.points += 1;
      awayTeamStanding.draws += 1;
      awayTeamStanding.drawn += 1;
      awayTeamStanding.points += 1;
    }

    homeTeamStanding.goalDifference = homeTeamStanding.goalsFor - homeTeamStanding.goalsAgainst;
    awayTeamStanding.goalDifference = awayTeamStanding.goalsFor - awayTeamStanding.goalsAgainst;
  });

  // Sort teams in each group
  Object.keys(standings).forEach(groupId => {
    standings[groupId].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  });

  return standings;
};
