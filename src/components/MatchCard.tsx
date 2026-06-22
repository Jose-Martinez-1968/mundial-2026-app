import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimeDisplay } from '../modules/timezone/TimeDisplay';
import { MapPin, Trophy, Flag as FlagIcon } from 'lucide-react';
import { Flag } from './Flag';

interface MatchCardProps {
  matchId: string;
  stage: string;
  team1: { name: string; flag?: string; score?: number | null };
  team2: { name: string; flag?: string; score?: number | null };
  stadium?: string;
  venue?: string;
  venueTimeZone: string;
  utcDateString?: string;
  officialDate: string;
  isOpening?: boolean;
  isFinal?: boolean;
  status?: string;
  kickoffStatus?: 'confirmed' | 'date-only';
}

export const MatchCard: React.FC<MatchCardProps> = ({
  stage,
  team1,
  team2,
  stadium,
  venue,
  venueTimeZone,
  utcDateString,
  officialDate,
  isOpening,
  isFinal,
  status,
  kickoffStatus = 'confirmed',
}) => {
  const stadiumName = venue || stadium || 'Estadio pendiente';
  const { t } = useTranslation();
  const officialDateLabel = new Date(`${officialDate}T00:00:00`).toLocaleDateString();

  const borderClass = isFinal
    ? 'border-yellow-500/50 hover:shadow-yellow-500/10'
    : isOpening
      ? 'border-blue-500/50 hover:shadow-blue-500/10'
      : 'border-slate-700/80 hover:border-slate-600';

  const bgClass = isFinal
    ? 'bg-gradient-to-br from-slate-800/80 to-[#332a1b]'
    : isOpening
      ? 'bg-gradient-to-br from-slate-800/80 to-[#1b2b33]'
      : 'bg-slate-800/60';

  return (
    <div className={`p-5 rounded-xl flex flex-col space-y-4 border transition-all duration-200 hover:shadow-lg ${bgClass} ${borderClass}`}>
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{stage}</span>
        {isOpening && (
          <span className="text-[10px] font-bold uppercase text-blue-400 flex items-center gap-1">
            <FlagIcon size={12} /> {t('opening_match')}
          </span>
        )}
        {isFinal && (
          <span className="text-[10px] font-bold uppercase text-yellow-500 flex items-center gap-1">
            <Trophy size={12} /> {t('final_match')}
          </span>
        )}
      </div>

      <div className="flex justify-between items-center px-2 py-2 relative">
        {status === 'LIVE' && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold tracking-widest rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            EN VIVO
          </div>
        )}

        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-900/50 shadow-inner overflow-hidden border border-white/5">
            <Flag name={team1.name} size={40} />
          </div>
          <span className="font-semibold text-center leading-tight text-sm">{team1.name}</span>
        </div>

        <div className="flex items-center gap-3">
          {team1.score != null && <span className="text-3xl font-black text-white">{team1.score}</span>}
          <div className="text-xs font-bold text-slate-600 bg-slate-900/50 px-3 py-1 rounded-full">{t('vs')}</div>
          {team2.score != null && <span className="text-3xl font-black text-white">{team2.score}</span>}
        </div>

        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-900/50 shadow-inner overflow-hidden border border-white/5">
            <Flag name={team2.name} size={40} />
          </div>
          <span className="font-semibold text-center leading-tight text-sm">{team2.name}</span>
        </div>
      </div>

      {kickoffStatus === 'date-only' ? (
        <div className="flex flex-col text-sm space-y-1 bg-slate-800/50 p-2 rounded-md border border-slate-700">
          <div className="flex justify-between items-center text-slate-300">
            <span>{t('local_time')}</span>
            <span className="font-semibold">Pendiente</span>
          </div>
          <div className="flex justify-between items-center text-blue-400">
            <span>{t('argentina_time')}</span>
            <span className="font-semibold">Pendiente</span>
          </div>
          <div className="text-xs text-amber-400">
            Fecha oficial: {officialDateLabel}. Horario pendiente en el feed oficial.
          </div>
        </div>
      ) : (
        <TimeDisplay utcDateString={utcDateString || officialDate} venueTimeZone={venueTimeZone} />
      )}

      <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-slate-500">
        <MapPin size={14} />
        <span>{t('stadium')}: <span className="text-slate-300 font-medium">{stadiumName}</span></span>
      </div>
    </div>
  );
};
