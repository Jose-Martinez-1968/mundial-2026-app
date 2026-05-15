import React, { useState } from 'react';
import type { Standing, Team } from '../types';
import { Flag } from './Flag';
import { PlayerRow } from './PlayerRow';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamProfileProps {
  team: Team;
  standing?: Standing;
  onAddYellowCard: (playerId: string) => void;
  onAddRedCard: (playerId: string) => void;
}

export const TeamProfile: React.FC<TeamProfileProps> = ({
  team,
  standing,
  onAddYellowCard,
  onAddRedCard,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-800/40 border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:border-emerald-500/30">
      <div
        className="p-4 cursor-pointer flex items-center justify-between bg-gradient-to-r from-slate-900/60 to-transparent"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <Flag code={team.code} size={48} className="rounded-md" />
          <div>
            <h3 className="font-bold text-lg text-slate-100">{team.name}</h3>
            <div className="flex gap-3 text-xs text-slate-400 mt-1">
              <span className="bg-slate-800 px-2 py-0.5 rounded border border-white/5">{team.continent}</span>
              {standing && (
                <>
                  <span title="Partidos jugados">PJ: {standing.played}</span>
                  <span title="Goles a favor">GF: {standing.goalsFor}</span>
                  <span title="Puntos">Pts: {standing.points}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <div className="flex items-center gap-1 text-xs">
            <Users size={14} />
            <span>{team.players?.length || 0}</span>
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-white/5 bg-slate-900/30">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Plantel (26 jugadores)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {team.players?.map(player => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    onAddYellowCard={onAddYellowCard}
                    onAddRedCard={onAddRedCard}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
