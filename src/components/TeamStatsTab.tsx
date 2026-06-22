import React, { useMemo } from 'react';
import type { Player, Standing, Team } from '../types';
import { TeamProfile } from './TeamProfile';
import { isPlayerInDanger, isPlayerSuspended } from '../modules/simulator/DisciplinaryEngine';
import { AlertTriangle, Globe } from 'lucide-react';

interface TeamStatsTabProps {
  teams: Team[];
  standings: Record<string, Standing[]>;
}

const CONFEDERATIONS = ['CONMEBOL', 'CONCACAF', 'UEFA', 'CAF', 'AFC', 'OFC'];

export const TeamStatsTab: React.FC<TeamStatsTabProps> = ({
  teams,
  standings,
}) => {
  const playersInDanger = useMemo(() => {
    const inDanger: { player: Player; teamName: string }[] = [];
    teams.forEach(team => {
      team.players?.forEach(player => {
        if (isPlayerInDanger(player)) {
          inDanger.push({ player, teamName: team.name });
        }
      });
    });
    return inDanger;
  }, [teams]);

  const suspendedPlayers = useMemo(() => {
    const suspended: { player: Player; teamName: string }[] = [];
    teams.forEach(team => {
      team.players?.forEach(player => {
        if (isPlayerSuspended(player)) {
          suspended.push({ player, teamName: team.name });
        }
      });
    });
    return suspended;
  }, [teams]);

  const flatStandings = useMemo(() => {
    const map = new Map<string, Standing>();
    Object.values(standings).forEach(group => {
      group.forEach(teamStanding => {
        map.set(teamStanding.teamName, teamStanding);
      });
    });
    return map;
  }, [standings]);

  const cardTotals = useMemo(() => {
    return teams.reduce(
      (totals, team) => {
        team.players?.forEach(player => {
          totals.yellow += player.yellowCards;
          totals.red += player.redCards;
        });
        return totals;
      },
      { yellow: 0, red: 0 },
    );
  }, [teams]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 border border-yellow-500/20 rounded-xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Amarillas</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="w-4 h-6 bg-yellow-400/90 rounded-sm shadow-[0_0_10px_rgba(250,204,21,0.25)]" />
            <span className="text-2xl font-black text-yellow-300">{cardTotals.yellow}</span>
          </div>
        </div>
        <div className="bg-slate-900/50 border border-red-500/20 rounded-xl p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rojas</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="w-4 h-6 bg-red-500/90 rounded-sm shadow-[0_0_10px_rgba(239,68,68,0.25)]" />
            <span className="text-2xl font-black text-red-400">{cardTotals.red}</span>
          </div>
        </div>
      </div>

      {suspendedPlayers.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-5 shadow-lg shadow-rose-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <AlertTriangle className="text-rose-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-400">Suspendidos pendientes</h2>
              <p className="text-xs text-rose-300/70">Las sanciones se consumen de forma automatica cuando el equipo completa su siguiente partido.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {suspendedPlayers.map(({ player, teamName }) => (
              <div key={player.id} className="flex items-center gap-2 bg-slate-900/50 border border-rose-500/20 px-3 py-1.5 rounded-lg text-sm">
                <span className="font-medium text-slate-200">{player.lastName}, {player.firstName}</span>
                <span className="text-xs text-slate-500">({teamName})</span>
                <span className="text-[10px] uppercase font-bold text-rose-400">
                  {player.suspensionMatchesRemaining} partido(s)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {playersInDanger.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-5 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <AlertTriangle className="text-amber-400" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-400">Jugadores en peligro</h2>
              <p className="text-xs text-amber-500/70">A una amarilla de quedar suspendidos para el siguiente partido del equipo.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {playersInDanger.map(({ player, teamName }) => (
              <div key={player.id} className="flex items-center gap-2 bg-slate-900/50 border border-amber-500/20 px-3 py-1.5 rounded-lg text-sm">
                <span className="font-medium text-slate-200">{player.lastName}, {player.firstName}</span>
                <span className="text-xs text-slate-500">({teamName})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-10">
        {CONFEDERATIONS.map(confederation => {
          const confederationTeams = teams.filter(team => team.continent === confederation);
          if (confederationTeams.length === 0) return null;

          return (
            <div key={confederation} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <Globe className="text-blue-400" size={20} />
                <h2 className="text-xl font-bold text-slate-100">{confederation}</h2>
                <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full ml-2">
                  {confederationTeams.length} equipos
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {confederationTeams.map(team => (
                  <TeamProfile
                    key={team.code}
                    team={team}
                    standing={flatStandings.get(team.name)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
