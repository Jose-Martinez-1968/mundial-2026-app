import React from 'react';
import { Flag } from './Flag';
import type { Standing } from '../types';

interface StandingsTableProps {
  groupName: string;
  standings: Standing[];
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ groupName, standings }) => {
  return (
    <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-700/80 shadow-lg">
      <div className="bg-gradient-to-r from-slate-700/80 to-slate-800/80 px-4 py-2.5">
        <h3 className="font-extrabold text-sm tracking-wider text-slate-200 uppercase">{groupName}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-700/50">
            <th className="px-4 py-2 text-left">Equipo</th>
            <th className="px-2 py-2 text-center">Pts</th>
            <th className="px-2 py-2 text-center">PJ</th>
            <th className="px-2 py-2 text-center">G</th>
            <th className="px-2 py-2 text-center">E</th>
            <th className="px-2 py-2 text-center">P</th>
            <th className="px-2 py-2 text-center">DG</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {standings.map((team, index) => {
            const isTop2 = index < 2;
            const isThird = index === 2;
            return (
              <tr
                key={`${team.code}-${index}`}
                className={`hover:bg-slate-700/30 transition-colors ${
                  isTop2
                    ? 'border-l-4 border-l-emerald-500'
                    : isThird
                    ? 'border-l-4 border-l-blue-500/60'
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                <td className="px-4 py-2.5 font-medium flex items-center gap-2 text-slate-200">
                  <Flag code={team.code} name={team.name} size={22} />
                  <span className="truncate">{team.name}</span>
                </td>
                <td className="px-2 py-2.5 text-center font-bold text-white">{team.points}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{team.played}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{team.wins}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{team.draws}</td>
                <td className="px-2 py-2.5 text-center text-slate-400">{team.losses}</td>
                <td className={`px-2 py-2.5 text-center font-semibold ${
                  team.goalDifference > 0 ? 'text-emerald-400' :
                  team.goalDifference < 0 ? 'text-red-400' : 'text-slate-500'
                }`}>
                  {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-1.5 flex gap-4 text-[9px] text-slate-600 border-t border-slate-700/30">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-emerald-500 rounded-sm" /> Clasifica directo
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-500/60 rounded-sm" /> Posible mejor 3°
        </span>
      </div>
    </div>
  );
};
