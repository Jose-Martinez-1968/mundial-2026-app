import React from 'react';
import type { Player } from '../types';
import { isPlayerInDanger, isPlayerSuspended } from '../modules/simulator/DisciplinaryEngine';

interface PlayerRowProps {
  player: Player;
  onAddYellowCard: (playerId: string) => void;
  onAddRedCard: (playerId: string) => void;
}

export const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  onAddYellowCard,
  onAddRedCard,
}) => {
  const suspended = isPlayerSuspended(player);
  const inDanger = isPlayerInDanger(player);

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
      suspended
        ? 'bg-red-950/30 border-red-500/30'
        : inDanger
          ? 'bg-amber-950/30 border-amber-500/30'
          : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60'
    }`}
    >
      <div className="flex flex-col">
        <span className="font-medium text-slate-200 text-sm">
          {player.lastName}, {player.firstName}
        </span>
        {player.nickname && (
          <span className="text-xs text-blue-400 italic">'{player.nickname}'</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {suspended && (
          <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider bg-red-500/10 px-2 py-1 rounded">
            Suspendido ({player.suspensionMatchesRemaining})
          </span>
        )}

        {!suspended && inDanger && (
          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider bg-amber-500/10 px-2 py-1 rounded">
            En peligro
          </span>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onAddYellowCard(player.id)}
            disabled={suspended}
            className="flex items-center justify-center w-7 h-9 bg-yellow-400/20 border border-yellow-500/50 rounded cursor-pointer hover:bg-yellow-400/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Añadir tarjeta amarilla"
          >
            <span className="text-xs font-bold text-yellow-500">{player.yellowCards}</span>
          </button>

          <button
            onClick={() => onAddRedCard(player.id)}
            disabled={suspended}
            className="flex items-center justify-center w-7 h-9 bg-red-500/20 border border-red-600/50 rounded cursor-pointer hover:bg-red-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Añadir tarjeta roja"
          >
            <span className="text-xs font-bold text-red-500">{player.redCards}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
