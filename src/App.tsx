import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  Clock,
  Globe,
  MapPin,
  MessageCircle,
  Medal,
  RefreshCcw,
  Send,
  Swords,
  Trophy,
} from 'lucide-react';
import fifaData from './data/fifaData.json';
import { Flag } from './components/Flag';
import { GlobalSearch } from './components/GlobalSearch';
import { MatchCard } from './components/MatchCard';
import { MatchDetailModal } from './components/MatchDetailModal';
import { StandingsTable } from './components/StandingsTable';
import { BestThirdsTable } from './components/BestThirdsTable';
import { TeamStatsTab } from './components/TeamStatsTab';
import { VenueCarousel } from './components/VenueCarousel';
import { useLocalStorage } from './hooks/useLocalStorage';
import { NotificationEngine } from './modules/alerts/NotificationEngine';
import { fetchTournamentData } from './services/api';
import { getMatchDeviceDateKey, getTodayDateKey } from './services/dateFilters';
import { validateMatches } from './services/matchValidation';
import { createRealtimeSync } from './services/realtimeSync';
import {
  normalizePlayerDiscipline,
} from './modules/simulator/DisciplinaryEngine';
import {
  calculateNextRound,
  calculateRoundOf32,
  calculateStandings,
} from './modules/simulator/BracketGenerator';
import type { GroupMatch, KnockoutMatch, MatchDTO, MatchTeamDTO, Standing, Team, Venue } from './types';

type TabId = 'matches' | 'groups' | 'thirds' | 'bracket' | 'venues' | 'stats';

type TabConfig = {
  id: TabId;
  label: string;
  icon: ReactNode;
};

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
const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';
const KNOCKOUT_MATCH_NUMBER_RANGES: Record<string, [number, number]> = {
  R32: [73, 88],
  R16: [89, 96],
  QF: [97, 100],
  SF: [101, 102],
  FINAL: [104, 104],
};
const WHATSAPP_FEEDBACK_MESSAGE = [
  'Hola Jose, vengo desde la App Copa Mundial 2026.',
  'Quiero dejarte mi feedback sobre la app.',
  'Mi comentario es:',
].join('\n\n');

const TABS: TabConfig[] = [
  { id: 'matches', label: 'Partidos', icon: <Calendar size={18} /> },
  { id: 'groups', label: 'Grupos (A-L)', icon: <ListIcon size={18} /> },
  { id: 'thirds', label: 'Mejores Terceros', icon: <Medal size={18} /> },
  { id: 'stats', label: 'Estadisticas', icon: <Trophy size={18} /> },
  { id: 'bracket', label: 'Llaves R32', icon: <Swords size={18} /> },
  { id: 'venues', label: 'Sedes', icon: <MapPin size={18} /> },
];

function ListIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );
}

const TAB_STYLES: Record<TabId, string> = {
  matches: 'bg-blue-600 shadow-blue-500/20',
  groups: 'bg-emerald-600 shadow-emerald-500/20',
  thirds: 'bg-violet-600 shadow-violet-500/20',
  stats: 'bg-cyan-600 shadow-cyan-500/20',
  bracket: 'bg-amber-600 shadow-amber-500/20',
  venues: 'bg-rose-600 shadow-rose-500/20',
};

const createTeams = (): Team[] => {
  const flatTeams = fifaData.groups.flatMap(group => group.teams) as Team[];

  return flatTeams.map(team => ({
    ...team,
    players: [],
  }));
};

const normalizeName = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

const sameName = (a: string | undefined, b: string | undefined): boolean => {
  return Boolean(a && b && normalizeName(a) === normalizeName(b));
};

const getMatchNumber = (matchId: string): number | null => {
  const match = matchId.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const formatDateLabel = (officialDate?: string): string => {
  if (!officialDate) return 'Fecha pendiente';
  return new Date(`${officialDate}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTimeLabel = (utcDateString: string | undefined, timeZone: string | undefined): string => {
  if (!utcDateString || !timeZone) return 'Pendiente';
  return new Intl.DateTimeFormat('es-AR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(new Date(utcDateString));
};

const getStatusLabel = (status?: MatchDTO['status']): string => {
  if (status === 'LIVE') return 'En vivo';
  if (status === 'FINISHED') return 'Finalizado';
  if (status === 'POSTPONED') return 'Postergado';
  if (status === 'CANCELLED') return 'Cancelado';
  return 'Pendiente';
};

const splitPlayerName = (playerName: string): { firstName: string; lastName: string } => {
  const parts = playerName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { firstName: '', lastName: playerName.trim() };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};

const resolveBookingTeamCode = (match: MatchDTO, bookingIndex: number): string | null => {
  const booking = match.bookings?.[bookingIndex];
  const teamCodes = [match.team1.code, match.team2.code].filter(Boolean);

  if (booking?.teamCode && teamCodes.includes(booking.teamCode)) {
    return booking.teamCode;
  }

  if (booking?.teamName) {
    if (sameName(booking.teamName, match.team1.name)) return match.team1.code || null;
    if (sameName(booking.teamName, match.team2.name)) return match.team2.code || null;
  }

  if (match.bookings?.length === 2) {
    return bookingIndex === 0 ? match.team1.code || null : match.team2.code || null;
  }

  return null;
};

function App() {
  const { t, i18n } = useTranslation();
  
  // Connection state
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Cached matches initialization as offline fallback
  const [matches, setMatches] = useState<MatchDTO[]>(() => {
    try {
      const cached = localStorage.getItem('wc2026_cached_matches');
      if (cached) {
        const parsed = JSON.parse(cached) as unknown;
        return validateMatches(parsed);
      }
    } catch (e) {
      console.error('Error cargando partidos cacheados:', e);
    }
    return [];
  });

  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [loading, setLoading] = useState(matches.length === 0);
  // "refreshing" tracks background/manual updates without blocking the UI.
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<KnockoutMatch | null>(null);

  const [activeTab, setActiveTab] = useLocalStorage<TabId>('wc2026_active_tab', 'groups');
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage<boolean>('wc2026_notifications', false);

  // Refs keep the latest values without forcing fetchMatches (and therefore
  // the realtime sync effect) to be recreated. This breaks the previous
  // re-subscription loop: fetchMatches now has a STABLE identity.
  const notificationsEnabledRef = useRef(notificationsEnabled);
  const matchesRef = useRef(matches);
  const isFirstLoadRef = useRef(matches.length === 0);

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  // Fetch matches from FIFA's live API (with static-file fallback). Runs in
  // the background and never blocks the UI. Only `loading` toggles on the
  // very first load; subsequent refreshes flip `refreshing`.
  //
  // Robustness: si la carga falla por completo (ni API en vivo ni archivo
  // local), conservamos los datos anteriores en lugar de vaciar la app.
  const fetchMatches = useCallback(async () => {
    const isFirstLoad = isFirstLoadRef.current;
    if (isFirstLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const result = await fetchTournamentData();

      // Solo actualizamos si obtuvimos datos; nunca sobreescribimos con [].
      if (result.matches.length > 0) {
        setMatches(result.matches);
        localStorage.setItem('wc2026_cached_matches', JSON.stringify(result.matches));
      }

      // Mostramos el aviso si la API en vivo fallo y se uso el respaldo.
      if (result.warning) {
        setCalendarError(result.warning);
      } else {
        setCalendarError(null);
      }

      setLastUpdate(new Date().toLocaleTimeString());
      if (notificationsEnabledRef.current && result.matches.length > 0) {
        NotificationEngine.checkMatchesAndNotify(result.matches);
      }
    } catch (error) {
      console.error('No se pudo cargar el calendario:', error);
      if (matchesRef.current.length === 0) {
        setCalendarError('No se pudo establecer conexión y no hay datos locales cargados.');
      } else {
        // Ya tenemos datos previos: avisamos pero no vaciamos la interfaz.
        setCalendarError('Actualización no disponible momentáneamente. Mostrando los últimos datos cargados.');
      }
    } finally {
      isFirstLoadRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }

    return createRealtimeSync({
      onStatusChange: setIsOnline,
      onSync: fetchMatches,
      intervalMs: 60_000, // sincronización con FIFA cada 60 s
    });
  }, [fetchMatches, setNotificationsEnabled]);

  // Derived: Dynamic Bookings & Suspensions Data Pipeline
  const enrichedTeams = useMemo(() => {
    const baseTeams = createTeams();
    const playersMap = new Map<string, {
      teamCode: string;
      name: string;
      yellow: number;
      red: number;
    }>();

    matches.forEach(match => {
      const matchBookings = match.bookings || [];
      matchBookings.forEach((booking, bookingIndex) => {
        const teamCode = resolveBookingTeamCode(match, bookingIndex);
        if (!teamCode) return;

        const playerKey = `${teamCode}:${normalizeName(booking.playerName)}`;
        const current = playersMap.get(playerKey) || {
          teamCode,
          name: booking.playerName.trim(),
          yellow: 0,
          red: 0,
        };

        if (booking.card === 'yellow') current.yellow += 1;
        if (booking.card === 'red') current.red += 1;
        playersMap.set(playerKey, current);
      });
    });

    return baseTeams.map(team => {
      const updatedPlayers = [...playersMap.entries()]
        .filter(([, player]) => player.teamCode === team.code)
        .map(([playerKey, player]) => {
          const nameParts = splitPlayerName(player.name);
          let yellowAccumulated = 0;
          let suspensionRemaining = 0;
          const teamFinishedMatches = matches
            .filter(m => m.status === 'FINISHED' && (m.team1.code === team.code || m.team2.code === team.code))
            .sort((a, b) => (a.utcDateString || a.officialDate).localeCompare(b.utcDateString || b.officialDate));

          teamFinishedMatches.forEach((match) => {
            if (suspensionRemaining > 0) {
              suspensionRemaining -= 1;
            }

            const matchBookings = match.bookings || [];
            matchBookings.forEach((booking, bookingIndex) => {
              const bookingTeamCode = resolveBookingTeamCode(match, bookingIndex);
              if (bookingTeamCode !== team.code) return;
              if (normalizeName(booking.playerName) !== normalizeName(player.name)) return;

              if (booking.card === 'yellow') {
                yellowAccumulated += 1;
                if (yellowAccumulated === 2) {
                  suspensionRemaining += 1;
                  yellowAccumulated = 0;
                }
              }

              if (booking.card === 'red') {
                suspensionRemaining += 1;
              }
            });
          });

          return normalizePlayerDiscipline({
            id: playerKey,
            teamCode: team.code,
            firstName: nameParts.firstName,
            lastName: nameParts.lastName,
            yellowCards: player.yellow,
            redCards: player.red,
            suspensionMatchesRemaining: suspensionRemaining,
            suspensionIssuedAtMatchCount: null,
          });
        })
        .sort((a, b) => a.lastName.localeCompare(b.lastName));

      return {
        ...team,
        players: updatedPlayers,
      };
    });
  }, [matches]);

  // Derived: Group Matches in Tournament format
  const groupMatches = useMemo((): GroupMatch[] => {
    const groupStageMatches = matches.filter(m => m.groupId);
    const flatTeams = enrichedTeams;
    return groupStageMatches.map(m => {
      const homeTeam = flatTeams.find(t => t.code === m.team1.code) || {
        name: m.team1.name,
        code: m.team1.code || '',
        flag: '',
        continent: '',
        seed: false,
      };
      const awayTeam = flatTeams.find(t => t.code === m.team2.code) || {
        name: m.team2.name,
        code: m.team2.code || '',
        flag: '',
        continent: '',
        seed: false,
      };
      return {
        id: m.matchId,
        groupId: m.groupId!,
        homeTeam,
        awayTeam,
        homeScore: m.team1.score,
        awayScore: m.team2.score,
      };
    });
  }, [matches, enrichedTeams]);

  // Derived: Standings
  const standings = useMemo(() => calculateStandings(groupMatches, enrichedTeams), [groupMatches, enrichedTeams]);

  const venueCityByStadium = useMemo(() => {
    return new Map(
      (fifaData.venues as Venue[]).map(venue => [
        venue.name,
        `${venue.city}, ${venue.country}`,
      ]),
    );
  }, []);

  const createOfficialStanding = useCallback((team: MatchTeamDTO): Standing | null => {
    if (!team.code || team.name === 'TBD') return null;
    const knownTeam = enrichedTeams.find(candidate => candidate.code === team.code || sameName(candidate.name, team.name));
    return {
      ...(knownTeam || {
        name: team.name,
        code: team.code,
        flag: '',
        continent: '',
        seed: false,
      }),
      name: knownTeam?.name || team.name,
      code: knownTeam?.code || team.code,
      teamId: knownTeam?.code || team.code,
      teamName: knownTeam?.name || team.name,
      groupId: '',
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      fairPlay: 0,
    };
  }, [enrichedTeams]);

  // Enrichment: FIFA is the source of truth for knockout fixtures, scores,
  // venues, kickoff times and winners. Simulated standings only fill pending
  // slots while the official API still exposes placeholders.
  const withOfficialKnockoutData = useCallback((bracket: KnockoutMatch[], roundPrefix: string): KnockoutMatch[] => {
    const range = KNOCKOUT_MATCH_NUMBER_RANGES[roundPrefix];
    if (!range) return bracket;

    const officialMatches = matches
      .filter(match => {
        const number = getMatchNumber(match.matchId);
        return number !== null && number >= range[0] && number <= range[1];
      })
      .sort((a, b) => (getMatchNumber(a.matchId) || 0) - (getMatchNumber(b.matchId) || 0));

    return bracket.map((match, index) => {
      const officialMatch = officialMatches[index];
      if (!officialMatch) {
        return {
          ...match,
          homeScore: null,
          awayScore: null,
          winner: null,
        };
      }

      const officialHome = createOfficialStanding(officialMatch.team1);
      const officialAway = createOfficialStanding(officialMatch.team2);
      const home = officialHome || match.home;
      const away = officialAway || match.away;
      let winner: Standing | null = null;

      if (officialMatch.winnerCode) {
        if (officialMatch.winnerCode === home?.code) winner = home;
        if (officialMatch.winnerCode === away?.code) winner = away;
      } else if (officialMatch.team1.score !== null && officialMatch.team2.score !== null) {
        if (officialMatch.team1.score > officialMatch.team2.score) winner = home;
        if (officialMatch.team2.score > officialMatch.team1.score) winner = away;
      }

      return {
        ...match,
        home,
        away,
        homeScore: officialMatch.team1.score,
        awayScore: officialMatch.team2.score,
        winner,
        sourceMatchId: officialMatch.matchId,
        stage: officialMatch.stage,
        status: officialMatch.status,
        officialDate: officialMatch.officialDate,
        utcDateString: officialMatch.utcDateString,
        kickoffStatus: officialMatch.kickoffStatus,
        stadium: officialMatch.stadium,
        venue: officialMatch.venue,
        venueCity: venueCityByStadium.get(officialMatch.venue) || venueCityByStadium.get(officialMatch.stadium || '') || 'Sede pendiente',
        venueTimeZone: officialMatch.venueTimeZone,
        homePlaceholder: officialMatch.team1.name,
        awayPlaceholder: officialMatch.team2.name,
      };
    });
  }, [createOfficialStanding, matches, venueCityByStadium]);

  // Brackets calculations
  const r32Bracket = useMemo(() => withOfficialKnockoutData(calculateRoundOf32(standings), 'R32'), [standings, withOfficialKnockoutData]);
  const r16Bracket = useMemo(() => withOfficialKnockoutData(calculateNextRound(r32Bracket, 'R16'), 'R16'), [r32Bracket, withOfficialKnockoutData]);
  const qfBracket = useMemo(() => withOfficialKnockoutData(calculateNextRound(r16Bracket, 'QF'), 'QF'), [r16Bracket, withOfficialKnockoutData]);
  const sfBracket = useMemo(() => withOfficialKnockoutData(calculateNextRound(qfBracket, 'SF'), 'SF'), [qfBracket, withOfficialKnockoutData]);
  const finalBracket = useMemo(() => withOfficialKnockoutData(calculateNextRound(sfBracket, 'FINAL'), 'FINAL'), [sfBracket, withOfficialKnockoutData]);

  // Filtering for groups list
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

  const getNextMatchForVenue = (venueName: string) => {
    const nextMatch = matches.find(match => {
      return match.venue === venueName && (match.status === 'SCHEDULED' || match.status === 'LIVE');
    });

    if (!nextMatch) {
      return { teams: 'Por determinar', date: '11 jun. 2026' };
    }

    return {
      teams: `${nextMatch.team1.name} vs ${nextMatch.team2.name}`,
      date: new Date(nextMatch.utcDateString || nextMatch.officialDate).toLocaleDateString(),
    };
  };

  // Dynamic Today's Date Filter for "Partidos"
  const todayDateString = useMemo(() => getTodayDateKey(), []);

  const matchesToday = useMemo(() => {
    return matches.filter(match => getMatchDeviceDateKey(match.utcDateString, match.officialDate) === todayDateString);
  }, [matches, todayDateString]);

  const completedMatchesCount = useMemo(() => {
    return matches.filter(m => m.status === 'FINISHED').length;
  }, [matches]);

  const enableNotifications = async () => {
    const granted = await NotificationEngine.requestPermission();
    setNotificationsEnabled(granted);
    if (granted) NotificationEngine.checkMatchesAndNotify(matches);
  };

  // Manual refresh: forces a reconnect + data fetch. Shows a spinner while
  // running. Safe to call repeatedly; overlapping calls are ignored upstream
  // by the realtimeSync guard, and `refreshing` reflects the in-flight state.
  const handleManualRefresh = useCallback(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCalendarError('Sin conexión a internet. Reintenta cuando vuelva la señal.');
      return;
    }
    void fetchMatches();
  }, [fetchMatches]);

  const toggleLanguage = () => {
    void i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  const renderKnockoutMatches = (bracketMatches: KnockoutMatch[]) => {
    return bracketMatches.map((match, idx) => {
      const homeTeamData = enrichedTeams.find(team => team.code === match.home?.code);
      const awayTeamData = enrichedTeams.find(team => team.code === match.away?.code);
      const hasSuspensions = (team: Team | undefined) => {
        return team?.players?.some(player => player.suspensionMatchesRemaining > 0) || false;
      };
      const matchHasSuspensions = hasSuspensions(homeTeamData) || hasSuspensions(awayTeamData);
      const homeName = match.home?.name || match.homePlaceholder || 'Pendiente de clasificacion';
      const awayName = match.away?.name || match.awayPlaceholder || 'Pendiente de clasificacion';
      const canOpenDetails = Boolean(match.home && match.away);
      const localTime = match.kickoffStatus === 'date-only'
        ? 'Pendiente'
        : formatTimeLabel(match.utcDateString, match.venueTimeZone);
      const argentinaTime = match.kickoffStatus === 'date-only'
        ? 'Pendiente'
        : formatTimeLabel(match.utcDateString, ARGENTINA_TIMEZONE);
      const scoreIsTied = match.homeScore !== null
        && match.homeScore !== undefined
        && match.awayScore !== null
        && match.awayScore !== undefined
        && match.homeScore === match.awayScore;
      const penaltyLabel = match.status === 'FINISHED' && scoreIsTied && match.winner
        ? 'Definido por penales'
        : 'Si empata: alargue 30 min y penales';

      const renderTeamRow = (side: 'home' | 'away') => {
        const team = side === 'home' ? match.home : match.away;
        const name = side === 'home' ? homeName : awayName;
        const score = side === 'home' ? match.homeScore : match.awayScore;
        const isWinner = Boolean(team && match.winner?.code === team.code);

        return (
          <div
            className={`flex justify-between items-center bg-slate-900/60 px-3 py-2 rounded-lg border transition-all ${
              isWinner
                ? 'border-emerald-500/50 ring-1 ring-emerald-500/30 bg-emerald-500/5'
                : team
                  ? 'border-white/5'
                  : 'border-dashed border-slate-700/70'
            }`}
          >
            <div className="flex items-center gap-2.5 font-bold text-slate-200 min-w-0">
              {team ? (
                <Flag code={team.code} name={team.name} size={26} />
              ) : (
                <span className="flex h-[26px] w-[38px] shrink-0 items-center justify-center rounded-sm border border-dashed border-slate-600 bg-slate-800 text-[9px] text-slate-500">
                  TBD
                </span>
              )}
              <span className={`text-sm truncate ${team ? 'text-slate-200' : 'text-slate-500'}`}>{name}</span>
              {isWinner && (
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">GANO</span>
              )}
            </div>
            <span className="w-8 text-center font-bold text-emerald-400 text-base">
              {score === null || score === undefined ? '-' : score}
            </span>
          </div>
        );
      };

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

          <div className="flex justify-between items-start gap-3 mb-3">
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                {match.sourceMatchId ? `${match.id} · ${match.sourceMatchId}` : match.id}
              </h4>
              <span className="mt-1 inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                {getStatusLabel(match.status)}
              </span>
            </div>
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
                  if (canOpenDetails) setSelectedMatchForModal(match);
                }}
                disabled={!canOpenDetails}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:cursor-not-allowed disabled:text-slate-600"
              >
                Detalles
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 relative z-10">
            {renderTeamRow('home')}
            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-slate-700/50" />
              <span className="text-slate-600 text-[10px] font-black italic">VS</span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-slate-700/50" />
            </div>
            {renderTeamRow('away')}

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar size={12} />
                  <span>Fecha</span>
                </div>
                <div className="mt-1 font-semibold text-slate-200">{formatDateLabel(match.officialDate)}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock size={12} />
                  <span>Hora local</span>
                </div>
                <div className="mt-1 font-semibold text-slate-200">{localTime}</div>
              </div>
              <div className="rounded-lg border border-blue-500/10 bg-blue-950/20 p-2">
                <div className="flex items-center gap-1.5 text-blue-300/70">
                  <Clock size={12} />
                  <span>Hora Argentina</span>
                </div>
                <div className="mt-1 font-semibold text-blue-200">{argentinaTime}</div>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-2">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin size={12} />
                  <span>Estadio</span>
                </div>
                <div className="mt-1 truncate font-semibold text-slate-200" title={match.venue || match.stadium || 'Estadio pendiente'}>
                  {match.venue || match.stadium || 'Estadio pendiente'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2 text-[11px]">
              <span className="truncate text-slate-400">{match.venueCity || 'Sede pendiente'}</span>
              <span className="shrink-0 rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 font-bold text-violet-200">
                {penaltyLabel}
              </span>
            </div>
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
                <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Datos oficiales en tiempo real</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-1 border-l border-white/10 pl-2">
                  {completedMatchesCount} / {matches.length} jugados
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md hidden md:block">
            <GlobalSearch teams={enrichedTeams} onSelectResult={() => setActiveTab('stats')} />
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300 ${
              isOnline
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-400 animate-pulse'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              {isOnline ? 'En línea' : 'Sin conexión'}
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed border border-blue-400/40 rounded-lg text-sm font-bold text-white transition-all"
                  title={refreshing ? 'Actualizando…' : 'Actualizar datos de partidos y tarjetas'}
            >
              <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
                  <span>{refreshing ? 'Actualizando…' : 'Actualizar'}</span>
            </button>

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
            <div className="flex items-center gap-2 text-xs text-slate-500 w-[150px] justify-end">
              <span className="relative flex h-2 w-2 shrink-0">
                {refreshing ? (
                  <RefreshCcw size={12} className="animate-spin text-blue-400" />
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                )}
              </span>
              <span className="truncate text-right">{refreshing ? 'Sincronizando…' : (lastUpdate || '---')}</span>
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
                      Partidos programados para hoy ({new Date(todayDateString + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {matchesToday.length === 0 ? (
                        <p className="col-span-2 text-center text-slate-500 py-10 bg-slate-900/40 border border-white/5 rounded-xl">
                          No hay partidos programados para el día de hoy.
                        </p>
                      ) : (
                        matchesToday.map(match => <MatchCard key={match.matchId} {...match} />)
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
                            <strong>Fase de grupos:</strong> Posiciones actualizadas en tiempo real de acuerdo a los resultados reales del torneo.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredGroupIds.map(groupId => (
                        <div key={groupId} className="space-y-4">
                          <StandingsTable groupName={`Grupo ${groupId}`} standings={standings[groupId]} />
                          <div className="bg-slate-800/40 rounded-xl p-3 border border-white/5 backdrop-blur-sm">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">
                              Partidos del Grupo
                            </h4>
                            <div className="space-y-2">
                              {groupMatches.filter(match => match.groupId === groupId).map(match => (
                                <div key={match.id} className="flex items-center justify-between bg-slate-900/40 p-2 rounded-lg border border-white/5">
                                  <div className="flex items-center gap-2 w-[40%] min-w-0">
                                    <Flag code={match.homeTeam.code} size={20} />
                                    <span className="text-xs truncate font-medium text-slate-300">{match.homeTeam.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 font-bold text-emerald-400 text-sm">
                                    <span>{match.homeScore === null ? '-' : match.homeScore}</span>
                                    <span className="text-slate-600 font-normal">-</span>
                                    <span>{match.awayScore === null ? '-' : match.awayScore}</span>
                                  </div>
                                  <div className="flex items-center gap-2 w-[40%] justify-end min-w-0">
                                    <span className="text-xs truncate font-medium text-slate-300">{match.awayTeam.name}</span>
                                    <Flag code={match.awayTeam.code} size={20} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'thirds' && (
                  <BestThirdsTable standings={standings} />
                )}

                {activeTab === 'bracket' && (
                  <div className="space-y-6">
                    <div className="p-4 bg-amber-950/40 border border-amber-500/20 text-amber-300 rounded-xl flex gap-3 text-sm w-full">
                      <Swords className="shrink-0 mt-0.5" size={20} />
                      <p>
                        <strong>Fase eliminatoria (Dieciseisavos R32):</strong> Cruces y clasificados generados de forma progresiva a medida que finalizan oficialmente los grupos.
                      </p>
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
                    teams={enrichedTeams}
                    standings={standings}
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

      <MatchDetailModal match={selectedMatchForModal} teams={enrichedTeams} onClose={() => setSelectedMatchForModal(null)} />

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
