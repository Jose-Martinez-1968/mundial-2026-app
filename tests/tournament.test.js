import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextRoundFromMatches, calculateRoundOf32FromStandings, calculateStandingsForGroups, getBestThirdPlacedTeams } from '../dist-test/modules/simulator/TournamentCore.js';
import {
  isPlayerInDanger,
  isPlayerSuspended,
  registerRedCard,
  registerYellowCard,
  serveSuspensionIfEligible,
} from '../dist-test/modules/simulator/DisciplinaryEngine.js';
import { validateMatches } from '../dist-test/services/matchValidation.js';

const createTeam = (code, name, ranking = 50) => ({
  code,
  name,
  flag: code.toLowerCase(),
  continent: 'TEST',
  seed: false,
  ranking,
  players: [],
});

const createMatch = (groupId, homeTeam, awayTeam, homeScore, awayScore, suffix) => ({
  id: `G-${groupId}-${suffix}`,
  groupId,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
});

const createGroup = (groupId, teams) => ({ id: groupId, teams });

test('calculateStandings orders by points then goal difference', () => {
  const alpha = createTeam('MEX', 'Mexico', 10);
  const beta = createTeam('RSA', 'South Africa', 20);
  const gamma = createTeam('KOR', 'South Korea', 30);
  const delta = createTeam('CZE', 'Czechia', 40);

  const matches = [
    createMatch('A', alpha, beta, 2, 0, 1),
    createMatch('A', gamma, delta, 1, 1, 2),
    createMatch('A', alpha, gamma, 1, 1, 3),
    createMatch('A', beta, delta, 0, 2, 4),
    createMatch('A', alpha, delta, 0, 1, 5),
    createMatch('A', beta, gamma, 1, 0, 6),
  ];

  const standings = calculateStandingsForGroups([createGroup('A', [alpha, beta, gamma, delta])], matches, [alpha, beta, gamma, delta]);
  assert.equal(standings.A[0].code, 'CZE');
  assert.equal(standings.A[0].points, 7);
  assert.equal(standings.A[1].code, 'MEX');
  assert.equal(standings.A[2].code, 'RSA');
  assert.equal(standings.A[3].code, 'KOR');
});

test('head-to-head breaks a two-team tie before overall goal difference', () => {
  const alpha = createTeam('A1', 'Alpha', 10);
  const beta = createTeam('B1', 'Beta', 20);
  const gamma = createTeam('C1', 'Gamma', 30);
  const delta = createTeam('D1', 'Delta', 40);

  const matches = [
    createMatch('A', alpha, beta, 1, 0, 1),
    createMatch('A', alpha, gamma, 0, 1, 2),
    createMatch('A', alpha, delta, 3, 0, 3),
    createMatch('A', beta, gamma, 3, 0, 4),
    createMatch('A', beta, delta, 4, 0, 5),
    createMatch('A', gamma, delta, 0, 1, 6),
  ];

  const standings = calculateStandingsForGroups([createGroup('A', [alpha, beta, gamma, delta])], matches, [alpha, beta, gamma, delta]);
  assert.equal(standings.A[0].code, 'A1');
  assert.equal(standings.A[1].code, 'B1');
});

test('getBestThirdPlacedTeams returns 8 teams', () => {
  const standings = {};
  for (const groupId of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
    standings[groupId] = [
      { code: `${groupId}1`, name: `${groupId}1`, points: 9, goalDifference: 6, goalsFor: 7, fairPlay: 0, ranking: 1, teamId: `${groupId}1`, teamName: `${groupId}1`, groupId, played: 3, wins: 3, draws: 0, losses: 0, won: 3, drawn: 0, lost: 0, goalsAgainst: 1, flag: '', continent: 'TEST', seed: false },
      { code: `${groupId}2`, name: `${groupId}2`, points: 6, goalDifference: 2, goalsFor: 4, fairPlay: 0, ranking: 2, teamId: `${groupId}2`, teamName: `${groupId}2`, groupId, played: 3, wins: 2, draws: 0, losses: 1, won: 2, drawn: 0, lost: 1, goalsAgainst: 2, flag: '', continent: 'TEST', seed: false },
      { code: `${groupId}3`, name: `${groupId}3`, points: groupId < 'I' ? 4 : 2, goalDifference: groupId < 'I' ? 1 : -1, goalsFor: groupId < 'I' ? 3 : 1, fairPlay: 0, ranking: 3, teamId: `${groupId}3`, teamName: `${groupId}3`, groupId, played: 3, wins: 1, draws: 1, losses: 1, won: 1, drawn: 1, lost: 1, goalsAgainst: 2, flag: '', continent: 'TEST', seed: false },
      { code: `${groupId}4`, name: `${groupId}4`, points: 0, goalDifference: -5, goalsFor: 0, fairPlay: 0, ranking: 4, teamId: `${groupId}4`, teamName: `${groupId}4`, groupId, played: 3, wins: 0, draws: 0, losses: 3, won: 0, drawn: 0, lost: 3, goalsAgainst: 5, flag: '', continent: 'TEST', seed: false },
    ];
  }

  const thirds = getBestThirdPlacedTeams(standings);
  assert.equal(thirds.length, 8);
  assert.ok(thirds.every(team => team.points === 4));
});

test('calculateRoundOf32 and calculateNextRound keep bracket progression', () => {
  const standings = {};
  for (const groupId of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
    standings[groupId] = [
      { code: `${groupId}1`, name: `${groupId}1`, points: 9, goalDifference: 6, goalsFor: 7, fairPlay: 0, ranking: 1, teamId: `${groupId}1`, teamName: `${groupId}1`, groupId, played: 3, wins: 3, draws: 0, losses: 0, won: 3, drawn: 0, lost: 0, goalsAgainst: 1, flag: '', continent: 'TEST', seed: false },
      { code: `${groupId}2`, name: `${groupId}2`, points: 6, goalDifference: 2, goalsFor: 4, fairPlay: 0, ranking: 2, teamId: `${groupId}2`, teamName: `${groupId}2`, groupId, played: 3, wins: 2, draws: 0, losses: 1, won: 2, drawn: 0, lost: 1, goalsAgainst: 2, flag: '', continent: 'TEST', seed: false },
      { code: `${groupId}3`, name: `${groupId}3`, points: 4, goalDifference: 1, goalsFor: 3, fairPlay: 0, ranking: 3, teamId: `${groupId}3`, teamName: `${groupId}3`, groupId, played: 3, wins: 1, draws: 1, losses: 1, won: 1, drawn: 1, lost: 1, goalsAgainst: 2, flag: '', continent: 'TEST', seed: false },
      { code: `${groupId}4`, name: `${groupId}4`, points: 0, goalDifference: -5, goalsFor: 0, fairPlay: 0, ranking: 4, teamId: `${groupId}4`, teamName: `${groupId}4`, groupId, played: 3, wins: 0, draws: 0, losses: 3, won: 0, drawn: 0, lost: 3, goalsAgainst: 5, flag: '', continent: 'TEST', seed: false },
    ];
  }

  const round = calculateRoundOf32FromStandings(standings);
  assert.equal(round.length, 16);
  assert.equal(round[0].home?.groupId, 'A');
  assert.equal(round[0].away?.groupId, 'B');
  assert.ok(['A', 'B', 'C', 'D', 'F'].includes(round[1].away?.groupId || ''));
  assert.ok(['C', 'D', 'F', 'G', 'H'].includes(round[4].away?.groupId || ''));
  assert.ok(['C', 'E', 'F', 'H', 'I'].includes(round[6].away?.groupId || ''));
  assert.ok(['E', 'H', 'I', 'J', 'K'].includes(round[7].away?.groupId || ''));
  assert.ok(['B', 'E', 'F', 'I', 'J'].includes(round[8].away?.groupId || ''));
  assert.ok(['A', 'E', 'H', 'I', 'J'].includes(round[9].away?.groupId || ''));
  assert.ok(['E', 'F', 'G', 'I', 'J'].includes(round[12].away?.groupId || ''));
  assert.ok(['D', 'E', 'I', 'J', 'L'].includes(round[14].away?.groupId || ''));

  round[0].homeScore = 1;
  round[0].awayScore = 1;
  round[0].winner = round[0].away;
  round[1].homeScore = 2;
  round[1].awayScore = 0;

  const next = calculateNextRoundFromMatches(round, 'R16');
  assert.equal(next.length, 8);
  assert.equal(next[0].home?.code, round[0].away?.code);
  assert.equal(next[0].away?.code, round[1].home?.code);
});

test('disciplinary helpers flag danger and suspension', () => {
  const basePlayer = {
    id: '1',
    teamCode: 'A',
    firstName: 'A',
    lastName: 'B',
    yellowCards: 0,
    redCards: 0,
    suspensionMatchesRemaining: 0,
    suspensionIssuedAtMatchCount: null,
  };

  const warned = registerYellowCard(basePlayer, 1);
  assert.equal(isPlayerInDanger(warned), true);

  const suspendedByYellows = registerYellowCard(warned, 1);
  assert.equal(suspendedByYellows.yellowCards, 0);
  assert.equal(isPlayerSuspended(suspendedByYellows), true);
  assert.equal(suspendedByYellows.suspensionIssuedAtMatchCount, 1);

  const suspendedByRed = registerRedCard(basePlayer, 2);
  assert.equal(suspendedByRed.redCards, 1);
  assert.equal(isPlayerSuspended(suspendedByRed), true);
  assert.equal(serveSuspensionIfEligible(suspendedByRed, 2).suspensionMatchesRemaining, 1);

  const served = serveSuspensionIfEligible(suspendedByRed, 3);
  assert.equal(served.suspensionMatchesRemaining, 0);
  assert.equal(served.suspensionIssuedAtMatchCount, null);
  assert.equal(isPlayerSuspended(served), false);
});

test('match validator accepts date-only matches without fake UTC kickoff', () => {
  const matches = validateMatches([
    {
      matchId: 'M002',
      stage: 'Fase de Grupos (Grupo A)',
      groupId: 'A',
      team1: { name: 'South Korea', code: 'KOR', score: null },
      team2: { name: 'Czechia', code: 'CZE', score: null },
      status: 'SCHEDULED',
      officialDate: '2026-06-11',
      venue: 'Estadio Guadalajara',
      venueTimeZone: 'America/Mexico_City',
      kickoffStatus: 'date-only',
      source: 'official-schedule',
    },
  ]);

  assert.equal(matches[0].kickoffStatus, 'date-only');
  assert.equal(matches[0].utcDateString, undefined);
});

test('match validator rejects confirmed matches without UTC kickoff', () => {
  assert.throws(() => validateMatches([
    {
      matchId: 'M001',
      stage: 'Fase de Grupos (Grupo A)',
      team1: { name: 'Mexico', code: 'MEX', score: null },
      team2: { name: 'South Africa', code: 'RSA', score: null },
      status: 'SCHEDULED',
      officialDate: '2026-06-11',
      venue: 'Mexico City Stadium',
      venueTimeZone: 'America/Mexico_City',
      kickoffStatus: 'confirmed',
      source: 'official-schedule',
    },
  ]), /registros invalidos/);
});
