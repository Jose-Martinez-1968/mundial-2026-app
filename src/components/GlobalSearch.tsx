import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Globe, Flag as FlagIcon, User } from 'lucide-react';
import type { Team } from '../types';
import { Flag } from './Flag';

interface SearchResult {
  type: 'team' | 'confederation' | 'player' | 'nickname';
  label: string;
  subLabel?: string;
  teamCode: string;
}

interface GlobalSearchProps {
  teams: Team[];
  onSelectResult: (result: SearchResult) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ teams, onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const term = query.toLowerCase().trim();
    if (term.length < 2) return [];

    const nextResults: SearchResult[] = [];
    const confeds = new Set<string>();

    teams.forEach(team => {
      if (team.continent.toLowerCase().includes(term) && !confeds.has(team.continent)) {
        confeds.add(team.continent);
        nextResults.push({ type: 'confederation', label: team.continent, teamCode: team.code });
      }

      if (team.name.toLowerCase().includes(term)) {
        nextResults.push({ type: 'team', label: team.name, subLabel: team.continent, teamCode: team.code });
      }

      team.players?.forEach(player => {
        const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();

        if (fullName.includes(term)) {
          nextResults.push({
            type: 'player',
            label: `${player.lastName}, ${player.firstName}`,
            subLabel: team.name,
            teamCode: team.code,
          });
        }

        if (player.nickname?.toLowerCase().includes(term)) {
          nextResults.push({
            type: 'nickname',
            label: `'${player.nickname}'`,
            subLabel: `${player.firstName} ${player.lastName} (${team.name})`,
            teamCode: team.code,
          });
        }
      });
    });

    return nextResults.slice(0, 8);
  }, [query, teams]);

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    onSelectResult(result);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder="Buscar país, jugador, apodo..."
          className="w-full bg-slate-800/80 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-500 text-slate-200 transition-all"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-xl shadow-black/50 overflow-hidden z-50">
          {results.map((result, idx) => (
            <button
              key={`${result.type}-${result.label}-${idx}`}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 hover:bg-slate-700/50 border-b border-white/5 last:border-0 flex items-center gap-3 transition-colors"
            >
              <div className="flex-shrink-0 text-slate-400">
                {result.type === 'team' && <FlagIcon size={16} />}
                {result.type === 'confederation' && <Globe size={16} />}
                {result.type === 'player' && <User size={16} />}
                {result.type === 'nickname' && <span className="text-yellow-500 font-bold text-lg leading-none">*</span>}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-200">{result.label}</span>
                {result.subLabel && <span className="text-xs text-slate-500">{result.subLabel}</span>}
              </div>
              <div className="ml-auto">
                <Flag code={result.teamCode} size={20} className="opacity-50" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
