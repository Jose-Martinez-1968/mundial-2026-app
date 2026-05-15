import type { Player } from '../types';

const REAL_PLAYERS: Record<string, Partial<Player>[]> = {
  ARG: [
    { firstName: 'Lionel', lastName: 'Messi', nickname: 'La Pulga' },
    { firstName: 'Emiliano', lastName: 'Martínez', nickname: 'Dibu' },
    { firstName: 'Angel', lastName: 'Di María', nickname: 'El Fideo' },
  ],
  FRA: [
    { firstName: 'Kylian', lastName: 'Mbappé', nickname: 'Donatello' },
    { firstName: 'Antoine', lastName: 'Griezmann', nickname: 'El Principito' },
  ],
  POR: [
    { firstName: 'Cristiano', lastName: 'Ronaldo', nickname: 'El Bicho' },
    { firstName: 'Bruno', lastName: 'Fernandes', nickname: 'El Arquitecto' },
  ],
  BRA: [
    { firstName: 'Vinícius', lastName: 'Júnior', nickname: 'Vini' },
    { firstName: 'Neymar', lastName: 'da Silva', nickname: 'Ney' },
  ],
  ENG: [
    { firstName: 'Jude', lastName: 'Bellingham', nickname: 'Belligol' },
    { firstName: 'Harry', lastName: 'Kane', nickname: 'El Huracán' },
  ],
  MEX: [
    { firstName: 'Guillermo', lastName: 'Ochoa', nickname: 'Memo' },
    { firstName: 'Santiago', lastName: 'Giménez', nickname: 'El Bebote' }
  ],
  USA: [
    { firstName: 'Christian', lastName: 'Pulisic', nickname: 'Captain America' }
  ]
};

const GENERIC_LAST_NAMES = ['Smith', 'Johnson', 'García', 'Martinez', 'Silva', 'Müller', 'Rossi', 'Kim', 'Ali', 'Popov', 'Dubois', 'Hernandez', 'Lopes'];
const GENERIC_FIRST_NAMES = ['John', 'David', 'Carlos', 'Luis', 'Pedro', 'Michael', 'Alexander', 'Mohammed', 'Yusuf', 'Jean', 'Paul', 'Ivan'];

const hashSeed = (value: string): number => {
  return [...value].reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
};

const pickDeterministic = <T,>(values: T[], seed: string): T => {
  return values[hashSeed(seed) % values.length];
};

/**
 * Generates exactly 26 players for each team code provided.
 * Injects real players if available, and fills the rest with generic names.
 */
export const generatePlayersForTeams = (teamCodes: string[]): Player[] => {
  const allPlayers: Player[] = [];

  teamCodes.forEach(code => {
    const injected = REAL_PLAYERS[code] || [];
    
    // Add real players
    injected.forEach((p, idx) => {
      allPlayers.push({
        id: `${code}-P${idx + 1}`,
        teamCode: code,
        firstName: p.firstName!,
        lastName: p.lastName!,
        nickname: p.nickname,
        yellowCards: 0,
        redCards: 0,
        suspensionMatchesRemaining: 0,
        suspensionIssuedAtMatchCount: null,
      });
    });

    // Fill the rest up to 26
    for (let i = injected.length; i < 26; i++) {
      const rFirstName = pickDeterministic(GENERIC_FIRST_NAMES, `${code}-first-${i}`);
      const rLastName = pickDeterministic(GENERIC_LAST_NAMES, `${code}-last-${i}`);
      
      allPlayers.push({
        id: `${code}-P${i + 1}`,
        teamCode: code,
        firstName: rFirstName,
        lastName: `${rLastName} ${i}`, // Add index to ensure unique display if needed
        yellowCards: 0,
        redCards: 0,
        suspensionMatchesRemaining: 0,
        suspensionIssuedAtMatchCount: null,
      });
    }
  });

  return allPlayers;
};
