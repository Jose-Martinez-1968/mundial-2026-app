import type { Player } from '../../types';

export const normalizePlayerDiscipline = (player: Player): Player => {
  return {
    ...player,
    yellowCards: player.yellowCards ?? 0,
    redCards: player.redCards ?? 0,
    suspensionMatchesRemaining: player.suspensionMatchesRemaining ?? 0,
    suspensionIssuedAtMatchCount: player.suspensionIssuedAtMatchCount ?? null,
  };
};

const issueSuspension = (player: Player, currentTeamMatchCount: number): Player => {
  const normalized = normalizePlayerDiscipline(player);
  return {
    ...normalized,
    suspensionMatchesRemaining: normalized.suspensionMatchesRemaining + 1,
    suspensionIssuedAtMatchCount: currentTeamMatchCount,
  };
};

export const registerYellowCard = (player: Player, currentTeamMatchCount: number): Player => {
  const normalized = normalizePlayerDiscipline(player);
  const nextYellowCards = normalized.yellowCards + 1;

  if (nextYellowCards >= 2) {
    return {
      ...issueSuspension(normalized, currentTeamMatchCount),
      yellowCards: 0,
    };
  }

  return {
    ...normalized,
    yellowCards: nextYellowCards,
  };
};

export const registerRedCard = (player: Player, currentTeamMatchCount: number): Player => {
  const normalized = normalizePlayerDiscipline(player);
  return {
    ...issueSuspension(normalized, currentTeamMatchCount),
    redCards: normalized.redCards + 1,
  };
};

export const serveSuspension = (player: Player): Player => {
  const normalized = normalizePlayerDiscipline(player);
  const remaining = Math.max(0, normalized.suspensionMatchesRemaining - 1);

  return {
    ...normalized,
    suspensionMatchesRemaining: remaining,
    suspensionIssuedAtMatchCount: remaining > 0 ? normalized.suspensionIssuedAtMatchCount : null,
  };
};

export const serveSuspensionIfEligible = (player: Player, completedTeamMatchCount: number): Player => {
  const normalized = normalizePlayerDiscipline(player);

  if (
    normalized.suspensionMatchesRemaining > 0 &&
    normalized.suspensionIssuedAtMatchCount !== null &&
    completedTeamMatchCount > normalized.suspensionIssuedAtMatchCount
  ) {
    return serveSuspension(normalized);
  }

  return normalized;
};

export const clearCautionAccumulation = (player: Player): Player => {
  const normalized = normalizePlayerDiscipline(player);
  return {
    ...normalized,
    yellowCards: 0,
  };
};

export const isPlayerSuspended = (player: Player): boolean => {
  return normalizePlayerDiscipline(player).suspensionMatchesRemaining > 0;
};

export const isPlayerInDanger = (player: Player): boolean => {
  const normalized = normalizePlayerDiscipline(player);
  return normalized.yellowCards === 1 && normalized.suspensionMatchesRemaining === 0;
};
