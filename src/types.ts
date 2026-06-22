export interface Player {
  id: string;
  teamCode: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  yellowCards: number;
  redCards: number;
  suspensionMatchesRemaining: number;
  suspensionIssuedAtMatchCount: number | null;
}

export interface Team {
  name: string;
  code: string;
  flag: string;
  continent: string;
  seed: boolean;
  ranking?: number;
  players?: Player[];
}

export interface Standing extends Team {
  teamId: string;
  teamName: string;
  groupId: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  fairPlay: number;
}

export interface Group {
  id: string;
  teams: Team[];
}

export interface GroupMatch {
  id: string;
  groupId: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
}

export interface KnockoutMatch {
  id: string;
  home: Standing | null;
  away: Standing | null;
  homeScore?: number | null;
  awayScore?: number | null;
  winner?: Standing | null;
}

export interface BookingDTO {
  playerName: string;
  teamCode?: string;
  teamName?: string;
  card: 'yellow' | 'red';
}

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export interface MatchTeamDTO {
  name: string;
  code?: string;
  score: number | null;
}

export interface MatchDTO {
  matchId: string;
  stage: string;
  groupId?: string;
  team1: MatchTeamDTO;
  team2: MatchTeamDTO;
  status: MatchStatus;
  utcDateString?: string;
  officialDate: string;
  venue: string;
  stadium?: string;
  venueTimeZone: string;
  isOpening?: boolean;
  isFinal?: boolean;
  kickoffStatus?: 'confirmed' | 'date-only';
  source: 'official-schedule' | 'live-feed' | 'official-api';
  winnerCode?: string;
  bookings?: BookingDTO[];
}

export interface Venue {
  id: string;
  name: string;
  commonName: string;
  city: string;
  country: string;
  capacity: number;
  timezone: string;
  lat: number;
  lon: number;
  matches: string;
  photo: string;
}
