import fifaData from '../data/fifaData.json';
import type { Group, MatchDTO } from '../types';
import { validateMatches } from './matchValidation';
import { fetchLiveMatchesFromFifa } from './fifaLiveApi';

const tournamentDataUrl = import.meta.env.VITE_TOURNAMENT_DATA_URL as string | undefined;
const TOURNAMENT_DATA_URL = tournamentDataUrl || '/data/matches.json';
const groups = (fifaData as { groups: Group[] }).groups;

const withCacheBuster = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

/**
 * Lee el calendario desde el archivo estático local (`/data/matches.json`).
 * Es el fallback cuando la API en vivo de FIFA no responde.
 */
const fetchStaticMatches = async (): Promise<MatchDTO[]> => {
  const response = await fetch(withCacheBuster(TOURNAMENT_DATA_URL), { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json() as unknown;
  return validateMatches(data);
};

export interface FetchResult {
  groups: Group[];
  matches: MatchDTO[];
  /** true si los datos provienen de la API en vivo de FIFA; false si son del archivo estático. */
  live: boolean;
  /** Mensaje de error si la fuente en vivo fallo y se uso el fallback. */
  warning?: string;
}

/**
 * Trae los datos del torneo intentando primero la API oficial de FIFA en
 * vivo. Si falla (sin conexion, error de red, etc.), cae al archivo
 * estático local como respaldo.
 *
 * Lanza un error solo si AMBAS fuentes fallan; nunca devuelve un array
 * vacio que vaciaria la interfaz sin explicacion.
 */
export const fetchTournamentData = async (): Promise<FetchResult> => {
  // 1) Intento en vivo contra la API oficial de FIFA.
  try {
    const matches = await fetchLiveMatchesFromFifa();
    return { groups, matches, live: true };
  } catch (liveError) {
    console.warn('API en vivo de FIFA no disponible, usando archivo estático:', liveError);
  }

  // 2) Fallback al archivo estático local.
  try {
    const matches = await fetchStaticMatches();
    return {
      groups,
      matches,
      live: false,
      warning: 'No se pudo conectar con la API en vivo de FIFA. Mostrando la última copia local.',
    };
  } catch (staticError) {
    console.error('Tampoco se pudo leer el calendario local:', staticError);
    // Propagamos: el llamador conserva los datos anteriores en lugar de vaciar la UI.
    throw new Error('No hay conexion con FIFA ni archivo local disponible.');
  }
};
