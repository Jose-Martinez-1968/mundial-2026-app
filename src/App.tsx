import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  Globe,
  List,
  MapPin,
  MessageCircle,
  RefreshCcw,
  Send,
  Swords,
  Trash2,
  Trophy,
} from 'lucide-react';
import fifaData from './data/fifaData.json';
import { Flag } from './components/Flag';
import { GlobalSearch } from './components/GlobalSearch';
import { MatchCard } from './components/MatchCard';
import { MatchDetailModal } from './components/MatchDetailModal';
import { StandingsTable } from './components/StandingsTable';
import { TeamStatsTab } from './components/TeamStatsTab';
import { VenueCarousel } from './components/VenueCarousel';
import { generatePlayersForTeams } from './data/playersData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { NotificationEngine } from './modules/alerts/NotificationEngine';
import { validateMatches } from './services/matchValidation';
import {
  clearCautionAccumulation,
  normalizePlayerDiscipline,
  registerRedCard,
  registerYellowCard,
  serveSuspensionIfEligible,
} from './modules/simulator/DisciplinaryEngine';
import {
  calculateNextRound,
  calculateRoundOf32,
  calculateStandings,
  generateInitialGroupMatches,
} from './modules/simulator/BracketGenerator';
import type { GroupMatch, KnockoutMatch, MatchDTO, Standing, Team, Venue } from './types';

type TabId = 'matches' | 'groups' | 'bracket' | 'venues' | 'stats';

type TabConfig = {
  id: TabId;
  label: string;
  icon: ReactNode;
};

type KnockoutScoreState = Record<string, {
  homeScore: number | null;
  awayScore: number | null;
  winner?: Standing | null;
}>;

const InstagramIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="7" r="1.2" fill="currentColor" />
  </svg>
);

const FacebookIcon = ({ size = 17 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M14.2 8.4V6.9c0-.7.5-1.1 1.2-1.1h1.5V3.2c-.7-.1-1.5-.2-2.3-.2-2.6 0-4.4 1.6-4.4 4.5v.9H7.4v3h2.8V21h3.3v-9.6h2.7l.5-3h-3.2Z" />
  </svg>
);

const OFFICIAL_TOTAL_MATCHES = 104;
const WHATSAPP_FEEDBACK_MESSAGE = [
  'Hola Jose, vengo desde la App Copa Mundial 2026.',
  'Quiero dejarte mi feedback sobre la app.',
  'Mi comentario es:',
].join('\n\n');

const TABS: TabConfig[] = [
  { id: 'matches', label: 'Partidos', icon: <Calendar size={18} /> },
  { id: 'groups', label: 'Grupos (A-L)', icon: <List size={18} /> },
  { id: 'stats', label: 'Estadisticas', icon: <Trophy size={18} /> },
  { id: 'bracket', label: 'Llaves R32', icon: <Swords size={18} /> },
  { id: 'venues', label: 'Sedes', icon: <MapPin size={18} /> },
];

const TAB_STYLES: Record<TabId, string> = {
  matches: 'bg-blue-600 shadow-blue-500/20',
  groups: 'bg-emerald-600 shadow-emerald-500/20',
  stats: 'bg-cyan-600 shadow-cyan-500/20',
  bracket: 'bg-amber-600 shadow-amber-500/20',
  venues: 'bg-rose-600 shadow-rose-500/20',
};

const parseScoreInput = (value: string): number | null => {
  if (value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
};

const normalizeName = (name: string): string => {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
};

const createTeams = (): Team[] => {
  const flatTeams = fifaData.groups.flatMap(group => group.teams) as Team[];
  const players = generatePlayersForTeams(flatTeams.map(team => team.code));

  return flatTeams.map(team => ({
    ...team,
    players: players
      .filter(player => player.teamCode === team.code)
      .map(normalizePlayerDiscipline),
  }));
};

const isKnockoutMatchCompleted = (match: KnockoutMatch): boolean => {
  if (!match.home || !match.away) return false;
  if (match.homeScore === null || match.homeScore === undefined) return false;
  if (match.awayScore === null || match.awayScore === undefined) return false;
  if (match.homeScore !== match.awayScore) return true;
  return Boolean(match.winner);
};

const buildCompletedMatchesByTeam = (
  groupMatches: GroupMatch[],
  knockoutRounds: KnockoutMatch[][],
): Record<string, number> => {
  const counts: Record<string, number> = {};

  const add = (teamCode: string | undefined) => {
    if (!teamCode) return;
    counts[teamCode] = (counts[teamCode] || 0) + 1;
  };

  groupMatches.forEach(match => {
    if (match.homeScore === null || match.awayScore === null) return;
    add(match.homeTeam.code);
    add(match.awayTeam.code);
  });

  knockoutRounds.forEach(round => {
    round.forEach(match => {
      if (!isKnockoutMatchCompleted(match)) return;
      add(match.home?.code);
      add(match.away?.code);
    });
  });

  return counts;
};

function App() {
  const { t, i18n } = useTranslation();
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<KnockoutMatch | null>(null);

  const [activeTab, setActiveTab] = useLocalStorage<TabId>('wc2026_active_tab', 'groups');
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage<boolean>('wc2026_notifications', false);
  const [liveMode, setLiveMode] = useLocalStorage<boolean>('wc2026_live_mode', false);
  const [groupMatches, setGroupMatches] = useLocalStorage('wc2026_group_matches', generateInitialGroupMatches);
  const [teams, setTeams] = useLocalStorage<Team[]>('wc2026_teams', createTeams);
  const [knockoutScores, setKnockoutScores] = useLocalStorage<KnockoutScoreState>('wc2026_knockout_scores', {});

  const standings = useMemo(() => calculateStandings(groupMatches, teams), [groupMatches, teams]);

  const withStoredScores = useCallback((bracket: KnockoutMatch[]): KnockoutMatch[] => {
    return bracket.map(match => ({
      ...match,
      homeScore: knockoutScores[match.id]?.homeScore ?? null,
      awayScore: knockoutScores[match.id]?.awayScore ?? null,
      winner: knockoutScores[match.id]?.winner ?? null,
    }));
  }, [knockoutScores]);

  const r32Bracket = useMemo(() => withStoredScores(calculateRoundOf32(standings)), [standings, withStoredScores]);
  const r16Bracket = useMemo(() => withStoredScores(calculateNextRound(r32Bracket, 'R16')), [r32Bracket, withStoredScores]);
  const qfBracket = useMemo(() => withStoredScores(calculateNextRound(r16Bracket, 'QF')), [r16Bracket, withStoredScores]);
  const sfBracket = useMemo(() => withStoredScores(calculateNextRound(qfBracket, 'SF')), [qfBracket, withStoredScores]);
  const finalBracket = useMemo(() => withStoredScores(calculateNextRound(sfBracket, 'FINAL')), [sfBracket, withStoredScores]);

  const completedMatchesByTeam = useMemo(() => {
    return buildCompletedMatchesByTeam(groupMatches, [r32Bracket, r16Bracket, qfBracket, sfBracket, finalBracket]);
  }, [groupMatches, r32Bracket, r16Bracket, qfBracket, sfBracket, finalBracket]);

  const filteredGroupIds = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const ids = Object.keys(standings).sort();
    if (!term) return ids;

    return ids.filter(groupId => {
      const groupName = `grupo ${groupId}`;
      const hasTeam = standings[groupId].some(team => team.name.toLowerCase().includes(term));
      return groupName.includes(term) || hasTeam;
    });
  }, [searchTerm, standings]);

  const venuesData = useMemo(() => {
    return (fifaData.venues as Venue[]).map(venue => ({
      id: venue.id,
      stadiumName: venue.name,
      commonName: venue.commonName,
      city: `${venue.city}, ${venue.country}`,
      capacity: venue.capacity.toLocaleString(),
      lat: venue.lat,
      lon: venue.lon,
      photos: [{ url: venue.photo, caption: venue.commonName }],
      matches: venue.matches,
    }));
  }, []);

  const simulatedMatchesCount = useMemo(() => {
    return groupMatches.filter(match => match.homeScore !== null && match.awayScore !== null).length;
  }, [groupMatches]);

  const fetchMatches = useCallback(async () => {
    try {
      const response = await fetch(`/data/matches.json?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json() as unknown;
      const nextMatches = validateMatches(data);

      setMatches(nextMatches);
      setCalendarError(null);
      setLastUpdate(new Date().toLocaleTimeString());
      if (notificationsEnabled) NotificationEngine.checkMatchesAndNotify(nextMatches);
    } catch (error) {
      console.error('No se pudo cargar el calendario:', error);
      setMatches([]);
      setCalendarError('No se pudo cargar un calendario valido. La simulacion local sigue disponible.');
    } finally {
      setLoading(false);
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    setTeams(previousTeams => {
      let changed = false;
      const nextTeams = previousTeams.map(team => ({
        ...team,
        players: team.players?.map(player => {
          const normalized = normalizePlayerDiscipline(player);
          if (
            normalized.yellowCards !== player.yellowCards ||
            normalized.redCards !== player.redCards ||
            normalized.suspensionMatchesRemaining !== player.suspensionMatchesRemaining ||
            normalized.suspensionIssuedAtMatchCount !== player.suspensionIssuedAtMatchCount
          ) {
            changed = true;
          }
          return normalized;
        }),
      }));
      return changed ? nextTeams : previousTeams;
    });
  }, [setTeams]);

  useEffect(() => {
    setTeams(previousTeams => {
      let changed = false;
      const nextTeams = previousTeams.map(team => ({
        ...team,
        players: team.players?.map(player => {
          const served = serveSuspensionIfEligible(
            normalizePlayerDiscipline(player),
            completedMatchesByTeam[team.code] || 0,
          );
          if (
            served.suspensionMatchesRemaining !== player.suspensionMatchesRemaining ||
            served.suspensionIssuedAtMatchCount !== player.suspensionIssuedAtMatchCount
          ) {
            changed = true;
          }
          return served;
        }),
      }));
      return changed ? nextTeams : previousTeams;
    });
  }, [completedMatchesByTeam, setTeams]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }

    void fetchMatches();
    const interval = window.setInterval(fetchMatches, 30000);
    return () => window.clearInterval(interval);
  }, [fetchMatches, setNotificationsEnabled]);

  useEffect(() => {
    if (!liveMode || matches.length === 0) return;

    setGroupMatches(previousMatches => {
      let changed = false;
      const nextMatches = previousMatches.map(groupMatch => {
        const liveMatch = matches.find(match => {
          const team1 = normalizeName(match.team1.name);
          const team2 = normalizeName(match.team2.name);
          const home = normalizeName(groupMatch.homeTeam.name);
          const away = normalizeName(groupMatch.awayTeam.name);
          return (team1 === home && team2 === away) || (team1 === away && team2 === home);
        });

        if (!liveMatch || (liveMatch.status !== 'LIVE' && liveMatch.status !== 'FINISHED')) {
          return groupMatch;
        }

        const liveHomeIsGroupHome = normalizeName(liveMatch.team1.name) === normalizeName(groupMatch.homeTeam.name);
        const homeScore = liveHomeIsGroupHome ? liveMatch.team1.score : liveMatch.team2.score;
        const awayScore = liveHomeIsGroupHome ? liveMatch.team2.score : liveMatch.team1.score;

        if (groupMatch.homeScore === homeScore && groupMatch.awayScore === awayScore) {
          return groupMatch;
        }

        changed = true;
        return { ...groupMatch, homeScore, awayScore };
      });

      return changed ? nextMatches : previousMatches;
    });
  }, [liveMode, matches, setGroupMatches]);

  const updateMatchScore = (matchId: string, side: 'home' | 'away', score: number | null) => {
    setGroupMatches(previousMatches => previousMatches.map(match => {
      if (match.id !== matchId) return match;
      return { ...match, [side === 'home' ? 'homeScore' : 'awayScore']: score };
    }));
  };

  const addYellowCard = (playerId: string) => {
    setTeams(previousTeams => previousTeams.map(team => ({
      ...team,
      players: team.players?.map(player => (
        player.id === playerId
          ? registerYellowCard(player, completedMatchesByTeam[team.code] || 0)
          : normalizePlayerDiscipline(player)
      )),
    })));
  };

  const addRedCard = (playerId: string) => {
    setTeams(previousTeams => previousTeams.map(team => ({
      ...team,
      players: team.players?.map(player => (
        player.id === playerId
          ? registerRedCard(player, completedMatchesByTeam[team.code] || 0)
          : normalizePlayerDiscipline(player)
      )),
    })));
  };

  const clearYellowCards = () => {
    if (!window.confirm('Limpiar tarjetas amarillas simples para la fase eliminatoria? Las rojas y suspensiones pendientes se mantienen.')) return;

    setTeams(previousTeams => previousTeams.map(team => ({
      ...team,
      players: team.players?.map(player => clearCautionAccumulation(player)),
    })));
  };

  const resetResults = () => {
    if (!window.confirm('Borrar todos los resultados simulados y reiniciar la memoria?')) return;

    setGroupMatches(generateInitialGroupMatches());
    setKnockoutScores({});
    setSelectedGroupId(null);
    setTeams(createTeams());
  };

  const updateKnockoutScore = (matchId: string, side: 'home' | 'away', score: number | null, match: KnockoutMatch) => {
    setKnockoutScores(previousScores => {
      const current = previousScores[matchId] || { homeScore: null, awayScore: null, winner: null };
      const next = { ...current, [side === 'home' ? 'homeScore' : 'awayScore']: score };
      let winner = next.winner;

      if (next.homeScore !== null && next.awayScore !== null) {
        if (next.homeScore > next.awayScore) winner = match.home;
        if (next.awayScore > next.homeScore) winner = match.away;
        if (next.homeScore === next.awayScore) winner = null;
      } else {
        winner = null;
      }

      return { ...previousScores, [matchId]: { ...next, winner } };
    });
  };

  const setKnockoutWinner = (matchId: string, winner: Standing | null) => {
    setKnockoutScores(previousScores => ({
      ...previousScores,
      [matchId]: { ...(previousScores[matchId] || { homeScore: null, awayScore: null }), winner },
    }));
  };

  const enableNotifications = async () => {
    const granted = await NotificationEngine.requestPermission();
    setNotificationsEnabled(granted);
    if (granted) NotificationEngine.checkMatchesAndNotify(matches);
  };

  const toggleLanguage = () => {
    void i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  const getNextMatchForVenue = (venueName: string) => {
    const nextMatch = matches.find(match => {
      return match.venue === venueName && (match.status === 'SCHEDULED' || match.status === 'LIVE');
    });

    if (!nextMatch) {
      return { teams: 'Por determinar', date: '11 jun. 2026' };
    }

    return {
      teams: `${nextMatch.team1.name} vs ${nextMatch.team2.name}`,
      date: nextMatch.kickoffStatus === 'date-only'
        ? new Date(`${nextMatch.officialDate}T00:00:00`).toLocaleDateString()
        : new Date(nextMatch.utcDateString || nextMatch.officialDate).toLocaleDateString(),
    };
  };

  const renderKnockoutMatches = (bracketMatches: KnockoutMatch[]) => {
    return bracketMatches.map((match, idx) => {
      const homeTeamData = teams.find(team => team.code === match.home?.code);
      const awayTeamData = teams.find(team => team.code === match.away?.code);
      const hasSuspensions = (team: Team | undefined) => {
        return team?.players?.some(player => player.suspensionMatchesRemaining > 0) || false;
      };
      const matchHasSuspensions = hasSuspensions(homeTeamData) || hasSuspensions(awayTeamData);
      const isDraw = match.homeScore !== null && match.awayScore !== null && match.homeScore === match.awayScore;

      if (!match.home || !match.away) {
        return (
          <div key={match.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl text-center text-slate-500 text-xs italic">
            Esperando clasificados para {match.id}
          </div>
        );
      }

      return (
        <motion.div
          key={match.id}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: idx * 0.03 }}
          className="bg-slate-800/60 border border-slate-700/80 p-4 rounded-xl shadow-lg hover:border-blue-500/40 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
            <Swords size={24} />
          </div>

          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              {match.id}
            </h4>
            <div className="flex gap-2">
              {matchHasSuspensions && (
                <div className="text-rose-400 animate-pulse bg-rose-500/10 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                  <AlertTriangle size={12} />
                  BAJAS
                </div>
              )}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedMatchForModal(match);
                }}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300"
              >
                Detalles
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 relative z-10">
            <div
              onClick={() => isDraw && setKnockoutWinner(match.id, match.home)}
              className={`flex justify-between items-center bg-slate-900/60 px-3 py-2 rounded-lg border transition-all ${
                match.winner?.code === match.home.code
                  ? 'border-emerald-500/50 ring-1 ring-emerald-500/30 bg-emerald-500/5'
                  : 'border-white/5'
              } ${isDraw ? 'cursor-pointer hover:bg-slate-800' : ''}`}
            >
              <div className="flex items-center gap-2.5 font-bold text-slate-200 min-w-0">
                <Flag code={match.home.code} name={match.home.name} size={26} />
                <span className="text-sm truncate">{match.home.name}</span>
                {isDraw && match.winner?.code === match.home.code && (
                  <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">PEN</span>
                )}
              </div>
              <input
                type="number"
                min="0"
                value={match.homeScore === null || match.homeScore === undefined ? '' : match.homeScore}
                onChange={(event) => updateKnockoutScore(match.id, 'home', parseScoreInput(event.target.value), match)}
                onClick={(event) => event.stopPropagation()}
                className="w-8 h-8 bg-slate-800 border border-slate-700 text-center rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-emerald-400"
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-700/50" />
              <span className="text-slate-600 text-[10px] font-black italic">VS</span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-700/50" />
            </div>

            <div
              onClick={() => isDraw && setKnockoutWinner(match.id, match.away)}
              className={`flex justify-between items-center bg-slate-900/60 px-3 py-2 rounded-lg border transition-all ${
                match.winner?.code === match.away.code
                  ? 'border-emerald-500/50 ring-1 ring-emerald-500/30 bg-emerald-500/5'
                  : 'border-white/5'
              } ${isDraw ? 'cursor-pointer hover:bg-slate-800' : ''}`}
            >
              <div className="flex items-center gap-2.5 font-bold text-slate-200 min-w-0">
                <Flag code={match.away.code} name={match.away.name} size={26} />
                <span className="text-sm truncate">{match.away.name}</span>
                {isDraw && match.winner?.code === match.away.code && (
                  <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">PEN</span>
                )}
              </div>
              <input
                type="number"
                min="0"
                value={match.awayScore === null || match.awayScore === undefined ? '' : match.awayScore}
                onChange={(event) => updateKnockoutScore(match.id, 'away', parseScoreInput(event.target.value), match)}
                onClick={(event) => event.stopPropagation()}
                className="w-8 h-8 bg-slate-800 border border-slate-700 text-center rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-emerald-400"
              />
            </div>

            <AnimatePresence>
              {isDraw && !match.winner && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[10px] text-amber-400 font-bold text-center mt-1 bg-amber-500/10 py-1 rounded border border-amber-500/20"
                >
                  Empate: haz clic en el equipo que gano por penales
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100 font-sans selection:bg-blue-500/30">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0f1a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/30 bg-black shadow-[0_0_24px_rgba(34,211,238,0.22)] ring-1 ring-white/10">
              <img 
                src="/brand/world-cup-2026-logo.png"
                alt="Logo Copa Mundial 2026"
                className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.18)]"
              />
            </div>
            <div>
              <h1 className="brand-title text-[1.65rem] md:text-[1.85rem] font-black leading-none tracking-normal bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300">
                {t('title')}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Simulacion controlada</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1 border-l border-white/10 pl-2">
                  {simulatedMatchesCount} / {groupMatches.length} simulados
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <GlobalSearch teams={teams} onSelectResult={() => setActiveTab('stats')} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { void enableNotifications(); }}
              className={`p-2 rounded-lg border transition-all ${notificationsEnabled ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'}`}
              title={notificationsEnabled ? 'Alertas ON' : 'Activar alertas'}
            >
              {notificationsEnabled ? <BellRing size={18} className="animate-pulse" /> : <Bell size={18} />}
            </button>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-all"
            >
              <Globe size={16} className="text-blue-400" />
              <span className="uppercase text-xs">{i18n.language}</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {lastUpdate || '---'}
            </div>
          </div>
        </div>
      </header>

      <nav className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap justify-center gap-3">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
              activeTab === tab.id ? 'text-white' : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className={`absolute inset-0 rounded-full shadow-lg ${TAB_STYLES[tab.id]}`}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon} {tab.label}
            </span>
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-4 pb-20">
        {calendarError && (
          <div className="mb-6 p-4 bg-amber-950/40 border border-amber-500/20 text-amber-200 rounded-xl flex gap-3 text-sm">
            <AlertTriangle className="shrink-0 mt-0.5" size={20} />
            <p>{calendarError}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {loading ? (
              <div className="flex justify-center py-20 text-blue-400">
                <RefreshCcw className="animate-spin h-8 w-8" />
              </div>
            ) : (
              <>
                {activeTab === 'matches' && (
                  <div className="space-y-5">
                    <div className="p-4 bg-blue-950/30 border border-blue-500/20 text-blue-200 rounded-xl text-sm">
                      Dataset local: {matches.length} de {OFFICIAL_TOTAL_MATCHES} partidos oficiales cargados. Los partidos con solo fecha no tienen horario validado.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {matches.length === 0 ? (
                        <p className="col-span-2 text-center text-slate-500 py-10">
                          No hay partidos validos para mostrar.
                        </p>
                      ) : (
                        matches.map(match => <MatchCard key={match.matchId} {...match} />)
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'groups' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Buscar equipo o grupo..."
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-600"
                        />
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                      </div>
                      <div className="p-4 bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 rounded-xl flex items-center justify-between gap-3 text-sm flex-[2]">
                        <div className="flex gap-3">
                          <Trophy className="shrink-0 mt-0.5" size={20} />
                          <p>
                            <strong>Fase de grupos interactiva:</strong> ingresa resultados para simular posiciones.
                          </p>
                        </div>
                        <button
                          onClick={resetResults}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-bold transition-colors border border-red-500/30"
                        >
                          <Trash2 size={14} /> Reiniciar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredGroupIds.map(groupId => (
                        <div key={groupId} className="space-y-4">
                          <StandingsTable groupName={`Grupo ${groupId}`} standings={standings[groupId]} />
                          <div className="bg-slate-800/40 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-center px-1">
                              Simular partidos
                              <button
                                onClick={() => setSelectedGroupId(selectedGroupId === groupId ? null : groupId)}
                                className={`text-[11px] font-bold transition-colors ${selectedGroupId === groupId ? 'text-red-400' : 'text-blue-400'}`}
                              >
                                {selectedGroupId === groupId ? 'Cerrar' : 'Editar resultados'}
                              </button>
                            </h4>

                            <AnimatePresence>
                              {selectedGroupId === groupId && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="space-y-2 overflow-hidden"
                                >
                                  {groupMatches.filter(match => match.groupId === groupId).map(match => (
                                    <div key={match.id} className="flex items-center justify-between bg-slate-900/40 p-2 rounded-lg border border-white/5 hover:border-blue-500/30 transition-colors">
                                      <div className="flex items-center gap-2 w-[40%] min-w-0">
                                        <Flag code={match.homeTeam.code} size={20} />
                                        <span className="text-xs truncate font-medium text-slate-300">{match.homeTeam.name}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          value={match.homeScore === null ? '' : match.homeScore}
                                          onChange={(event) => updateMatchScore(match.id, 'home', parseScoreInput(event.target.value))}
                                          className="w-8 h-8 bg-slate-800 border border-slate-700 text-center rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold"
                                        />
                                        <span className="text-slate-600 text-xs">-</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={match.awayScore === null ? '' : match.awayScore}
                                          onChange={(event) => updateMatchScore(match.id, 'away', parseScoreInput(event.target.value))}
                                          className="w-8 h-8 bg-slate-800 border border-slate-700 text-center rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold"
                                        />
                                      </div>
                                      <div className="flex items-center gap-2 w-[40%] justify-end min-w-0">
                                        <span className="text-xs truncate font-medium text-slate-300">{match.awayTeam.name}</span>
                                        <Flag code={match.awayTeam.code} size={20} />
                                      </div>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {!selectedGroupId && (
                              <p className="text-[10px] text-center text-slate-600 italic">Haz clic en editar para simular resultados</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'bracket' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="p-4 bg-amber-950/40 border border-amber-500/20 text-amber-300 rounded-xl flex gap-3 text-sm flex-1">
                        <Swords className="shrink-0 mt-0.5" size={20} />
                        <p>
                          <strong>Fase eliminatoria:</strong> cruces dinamicos basados en tus resultados de grupos.
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                          <div className={`w-2 h-2 rounded-full ${liveMode ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
                          <span className="text-xs font-bold text-slate-300">MODO REAL</span>
                          <button
                            onClick={() => setLiveMode(!liveMode)}
                            className={`ml-2 w-8 h-4 rounded-full transition-colors relative ${liveMode ? 'bg-red-500' : 'bg-slate-600'}`}
                          >
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${liveMode ? 'translate-x-4' : ''}`} />
                          </button>
                        </div>
                        <button
                          onClick={clearYellowCards}
                          className="px-4 py-3 md:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                        >
                          <RefreshCcw size={16} className="text-amber-400" />
                          Limpiar amarillas
                        </button>
                      </div>
                    </div>

                    <div className="flex overflow-x-auto pb-8 gap-12 snap-x snap-mandatory hide-scrollbar relative items-center">
                      <div className="min-w-[280px] snap-center">
                        <h3 className="text-center text-emerald-400 font-bold mb-6 uppercase tracking-wider text-sm sticky top-0 bg-[#0a0f1a]/80 backdrop-blur-md py-2 z-20">Dieciseisavos (R32)</h3>
                        <div className="flex flex-col gap-4">{renderKnockoutMatches(r32Bracket)}</div>
                      </div>
                      <div className="min-w-[280px] snap-center flex flex-col justify-center">
                        <h3 className="text-center text-emerald-400 font-bold mb-6 uppercase tracking-wider text-sm sticky top-0 bg-[#0a0f1a]/80 backdrop-blur-md py-2 z-20">Octavos (R16)</h3>
                        <div className="flex flex-col gap-[7.5rem]">{renderKnockoutMatches(r16Bracket)}</div>
                      </div>
                      <div className="min-w-[280px] snap-center flex flex-col justify-center">
                        <h3 className="text-center text-emerald-400 font-bold mb-6 uppercase tracking-wider text-sm sticky top-0 bg-[#0a0f1a]/80 backdrop-blur-md py-2 z-20">Cuartos (QF)</h3>
                        <div className="flex flex-col gap-[19rem]">{renderKnockoutMatches(qfBracket)}</div>
                      </div>
                      <div className="min-w-[280px] snap-center flex flex-col justify-center">
                        <h3 className="text-center text-emerald-400 font-bold mb-6 uppercase tracking-wider text-sm sticky top-0 bg-[#0a0f1a]/80 backdrop-blur-md py-2 z-20">Semifinales</h3>
                        <div className="flex flex-col gap-[42rem]">{renderKnockoutMatches(sfBracket)}</div>
                      </div>
                      <div className="min-w-[280px] snap-center flex flex-col justify-center relative">
                        <h3 className="text-center text-amber-400 font-bold mb-6 uppercase tracking-wider text-sm sticky top-0 bg-[#0a0f1a]/80 backdrop-blur-md py-2 z-20">Gran Final</h3>
                        <div className="flex flex-col relative z-10 scale-110 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                          {renderKnockoutMatches(finalBracket)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'stats' && (
                  <TeamStatsTab
                    teams={teams}
                    standings={standings}
                    onAddYellowCard={addYellowCard}
                    onAddRedCard={addRedCard}
                  />
                )}

                {activeTab === 'venues' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                  >
                    {venuesData.map(venue => (
                      <VenueCarousel
                        key={venue.id}
                        {...venue}
                        nextMatch={getNextMatchForVenue(venue.stadiumName)}
                      />
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <MatchDetailModal match={selectedMatchForModal} teams={teams} onClose={() => setSelectedMatchForModal(null)} />

      <footer className="border-t border-white/5 py-10 text-center">
        <p className="brand-title text-sm md:text-base font-black tracking-normal bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300">
          Copa Mundial de la FIFA 2026
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-400">
          Realizado por Jose A. Martinez con IA
        </p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-600">
          Mendoza Argentina
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {[
            {
              label: 'Instagram',
              icon: <InstagramIcon />,
              href: 'https://ig.me/m/josealbertomartinez496',
            },
            { label: 'Facebook', icon: <FacebookIcon /> },
            {
              label: 'WhatsApp',
              icon: <MessageCircle size={17} />,
              href: `https://wa.me/5492616169118?text=${encodeURIComponent(WHATSAPP_FEEDBACK_MESSAGE)}`,
            },
            { label: 'Telegram', icon: <Send size={17} />, href: 'https://t.me/Manteca22' },
          ].map(item => (
            <a
              key={item.label}
              href={item.href || '#'}
              target={item.href ? '_blank' : undefined}
              rel={item.href ? 'noreferrer' : undefined}
              aria-label={item.label}
              title={item.label}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 text-slate-400 transition-all hover:-translate-y-0.5 hover:border-cyan-400/50 hover:text-cyan-300 hover:shadow-[0_0_18px_rgba(34,211,238,0.16)]"
            >
              {item.icon}
            </a>
          ))}
        </div>
        <div className="mt-5 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-700">
          <span>{matches.length} / {OFFICIAL_TOTAL_MATCHES} cargados</span>
          <span>-</span>
          <span>48 Equipos</span>
          <span>-</span>
          <span>16 Sedes</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
