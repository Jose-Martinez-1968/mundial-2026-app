import React, { useMemo } from 'react';
import { Flag } from './Flag';
import { getBestThirdPlacedTeams } from '../modules/simulator/BracketGenerator';
import { GROUPS_ORDER } from '../modules/simulator/TournamentCore';
import type { Standing } from '../types';

interface BestThirdsTableProps {
  standings: Record<string, Standing[]>;
}

/** How many groups are still incomplete (any team with < 3 matches played). */
const countIncompleteGroups = (standings: Record<string, Standing[]>): number => {
  return GROUPS_ORDER.filter(groupId => {
    const group = standings[groupId];
    return !group || group.length === 0 || group.some(t => t.played < 3);
  }).length;
};

export const BestThirdsTable: React.FC<BestThirdsTableProps> = ({ standings }) => {
  const thirdPlacedTeams = useMemo(() => getBestThirdPlacedTeams(standings), [standings]);

  const incompleteGroups = useMemo(() => countIncompleteGroups(standings), [standings]);
  const allComplete = incompleteGroups === 0;

  // A team "qualifies" (top 8) only when all 12 groups are complete.
  // Before that we show a projected cutoff line at position 8.
  const QUALIFY_COUNT = 8;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="p-4 bg-violet-950/30 border border-violet-500/20 text-violet-200 rounded-xl flex gap-3 text-sm">
        <span className="text-lg">🏅</span>
        <div>
          <p>
            <strong>Mejores Terceros:</strong> De los 12 grupos (A-L), los 8 mejores terceros clasifican a la ronda de Dieciseisavos (R32).
          </p>
          {!allComplete && (
            <p className="mt-1 text-violet-400/70 text-xs">
              Quedan <strong>{incompleteGroups}</strong> grupo(s) sin completar. La línea de corte es proyectada y puede cambiar.
            </p>
          )}
        </div>
      </div>

      {/* Ranking table */}
      <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700/80 shadow-lg">
        <div className="bg-gradient-to-r from-violet-700/60 to-slate-800/80 px-4 py-2.5">
          <h3 className="font-extrabold text-sm tracking-wider text-slate-200 uppercase">
            Ranking de Terceros
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-700/50">
                <th className="px-3 py-2 text-center">#</th>
                <th className="px-4 py-2 text-left">Equipo</th>
                <th className="px-2 py-2 text-center">Grupo</th>
                <th className="px-2 py-2 text-center">PJ</th>
                <th className="px-2 py-2 text-center">PG</th>
                <th className="px-2 py-2 text-center">PE</th>
                <th className="px-2 py-2 text-center">PP</th>
                <th className="px-2 py-2 text-center">GF</th>
                <th className="px-2 py-2 text-center">GC</th>
                <th className="px-2 py-2 text-center">DG</th>
                <th className="px-3 py-2 text-center font-bold">Pts</th>
                <th className="px-2 py-2 text-center">JL</th>
              </tr>
            </thead>
            <tbody>
              {thirdPlacedTeams.map((team, index) => {
                const qualifies = index < QUALIFY_COUNT;
                const isCutoff = index === QUALIFY_COUNT && !allComplete;
                const rank = index + 1;

                return (
                  <React.Fragment key={team.code}>
                    {/* Cutoff divider line after 8th place (projected) */}
                    {isCutoff && (
                      <tr>
                        <td colSpan={12} className="px-3 py-1 bg-amber-500/10 border-y border-dashed border-amber-500/40">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                            ── Línea de corte (proyectada) ──
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr
                      className={`transition-colors ${
                        qualifies
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'bg-slate-900/20 hover:bg-slate-700/30'
                      } ${rank <= QUALIFY_COUNT ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                    >
                      {/* Rank */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                          rank <= QUALIFY_COUNT
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700/50 text-slate-500'
                        }`}>
                          {rank}
                        </span>
                      </td>

                      {/* Team name + flag */}
                      <td className="px-4 py-2.5 font-medium flex items-center gap-2 text-slate-200">
                        <Flag code={team.code} name={team.name} size={22} />
                        <span className="truncate">{team.name}</span>
                        {qualifies && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                            CLASIFICA
                          </span>
                        )}
                      </td>

                      {/* Group badge */}
                      <td className="px-2 py-2.5 text-center">
                        <span className="text-[10px] font-bold bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">
                          {team.groupId}
                        </span>
                      </td>

                      {/* Stats */}
                      <td className="px-2 py-2.5 text-center text-slate-400">{team.played}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400">{team.won}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400">{team.drawn}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400">{team.lost}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400">{team.goalsFor}</td>
                      <td className="px-2 py-2.5 text-center text-slate-400">{team.goalsAgainst}</td>
                      <td className={`px-2 py-2.5 text-center font-semibold ${
                        team.goalDifference > 0 ? 'text-emerald-400' :
                        team.goalDifference < 0 ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                      </td>

                      {/* Points */}
                      <td className="px-3 py-2.5 text-center font-bold text-white text-base">{team.points}</td>

                      {/* Fair Play (yellow/red indicator) */}
                      <td className="px-2 py-2.5 text-center">
                        <FairPlayIndicator fairPlay={team.fairPlay} />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 flex flex-wrap gap-4 text-[9px] text-slate-600 border-t border-slate-700/30">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-sm" /> Clasifica (top 8)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-0 border-t border-dashed border-amber-500/60" /> Línea de corte
          </span>
          <span className="flex items-center gap-1">
            <span className="text-amber-400">●</span> JL = Juego Limpio
          </span>
          <span className="text-slate-700">
            Criterios: Pts → DG → GF → PG → JL
          </span>
        </div>
      </div>
    </div>
  );
};

/** Small visual indicator for fair-play score (higher = cleaner). */
const FairPlayIndicator: React.FC<{ fairPlay: number }> = ({ fairPlay }) => {
  if (fairPlay === 0) {
    return <span className="text-slate-600">—</span>;
  }
  return (
    <span
      className={`text-xs font-bold ${
        fairPlay > 0 ? 'text-emerald-500/70' : 'text-red-500/70'
      }`}
      title={`Puntaje de juego limpio: ${fairPlay}`}
    >
      {fairPlay > 0 ? '✓' : '✗'}
    </span>
  );
};
