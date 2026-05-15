import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import type { KnockoutMatch, Team } from '../types';
import { Flag } from './Flag';
import { isPlayerSuspended } from '../modules/simulator/DisciplinaryEngine';

interface MatchDetailModalProps {
  match: KnockoutMatch | null;
  teams: Team[];
  onClose: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, teams, onClose }) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (match) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'auto'; };
    }
  }, [match]);

  if (!match) return null;

  const homeCode = match.home?.code;
  const awayCode = match.away?.code;
  const homeTeam = homeCode ? teams.find(t => t.code === homeCode) : null;
  const awayTeam = awayCode ? teams.find(t => t.code === awayCode) : null;

  const getSuspendedPlayers = (team: Team | null | undefined) => {
    if (!team || !team.players) return [];
    return team.players.filter(isPlayerSuspended);
  };

  const homeSuspended = getSuspendedPlayers(homeTeam);
  const awaySuspended = getSuspendedPlayers(awayTeam);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full p-1 transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div className="p-6 pb-4 border-b border-white/5 bg-slate-800/50">
            <h3 className="text-xl font-black text-white text-center mb-1">
              {match.id}
            </h3>
            <p className="text-xs text-slate-400 text-center uppercase tracking-widest font-semibold">
              Dieciseisavos de Final
            </p>
          </div>

          <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 flex flex-col items-center gap-2">
                <Flag code={match.home?.code} name={match.home?.name} size={64} className="shadow-lg" />
                <span className="font-bold text-center text-slate-200">{match.home?.name || 'TBD'}</span>
              </div>
              <div className="text-xl font-black text-slate-600">VS</div>
              <div className="flex-1 flex flex-col items-center gap-2">
                <Flag code={match.away?.code} name={match.away?.name} size={64} className="shadow-lg" />
                <span className="font-bold text-center text-slate-200">{match.away?.name || 'TBD'}</span>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-rose-500/10">
              <div className="flex items-center gap-2 mb-4 text-rose-400 border-b border-white/5 pb-2">
                <AlertTriangle size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">Reporte Disciplinario (Bajas)</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Home Suspended */}
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">{match.home?.name || 'Local'}</h5>
                  {homeSuspended.length > 0 ? (
                    <ul className="space-y-2">
                      {homeSuspended.map(p => (
                        <li key={p.id} className="text-sm text-slate-300 flex items-start gap-2 bg-slate-800/80 p-2 rounded">
                          <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold mt-0.5">SUSP</span>
                          <span>{p.lastName}, {p.firstName}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Plantel completo</p>
                  )}
                </div>

                {/* Away Suspended */}
                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">{match.away?.name || 'Visitante'}</h5>
                  {awaySuspended.length > 0 ? (
                    <ul className="space-y-2">
                      {awaySuspended.map(p => (
                        <li key={p.id} className="text-sm text-slate-300 flex items-start gap-2 bg-slate-800/80 p-2 rounded">
                          <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold mt-0.5">SUSP</span>
                          <span>{p.lastName}, {p.firstName}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Plantel completo</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
