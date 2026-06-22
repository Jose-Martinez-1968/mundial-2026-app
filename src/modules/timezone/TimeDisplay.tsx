import React from 'react';
import { useTranslation } from 'react-i18next';

interface TimeDisplayProps {
  utcDateString: string; // ISO format e.g., '2026-06-11T20:00:00Z'
  venueTimeZone: string; // e.g., 'America/Mexico_City'
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ utcDateString, venueTimeZone }) => {
  const { t } = useTranslation();
  const date = new Date(utcDateString);

  // Format local time at venue using 24h format
  const localTime = new Intl.DateTimeFormat('es-AR', {
    timeZone: venueTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date);

  // Format time in Argentina using 24h format
  const argentinaTime = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date);

  return (
    <div className="flex flex-col text-sm space-y-1 bg-slate-800/50 p-2 rounded-md border border-slate-700">
      <div className="flex justify-between items-center text-slate-300">
        <span>{t('local_time')}</span>
        <span className="font-semibold">{localTime}</span>
      </div>
      <div className="flex justify-between items-center text-blue-400">
        <span>{t('argentina_time')}</span>
        <span className="font-semibold">{argentinaTime}</span>
      </div>
    </div>
  );
};
