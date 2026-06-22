import React from 'react';
import type { Player } from '../types';
import { isPlayerInDanger, isPlayerSuspended } from '../modules/simulator/DisciplinaryEngine';

interface PlayerRowProps {
  player: Player;
}

export const PlayerRow: React.FC<PlayerRowProps> = ({ player }) => {
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
          <div
            className={`flex items-center justify-center w-7 h-9 rounded border transition-all duration-200 ${
              player.yellowCards > 0
                ? 'bg-yellow-400/20 border-yellow-500/50 text-yellow-400 font-extrabold shadow-[0_0_8px_rgba(250,204,21,0.2)]'
                : 'bg-slate-800/20 border-slate-700/50 text-slate-500'
            }`}
            title={`${player.yellowCards} Tarjetas Amarillas`}
          >
            <span className="text-xs font-bold">{player.yellowCards}</span>
          </div>

          <div
            className={`flex items-center justify-center w-7 h-9 rounded border transition-all duration-200 ${
              player.redCards > 0
                ? 'bg-red-500/20 border-red-600/50 text-red-500 font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                : 'bg-slate-800/20 border-slate-700/50 text-slate-500'
            }`}
            title={`${player.redCards} Tarjetas Rojas`}
          >
            <span className="text-xs font-bold">{player.redCards}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
