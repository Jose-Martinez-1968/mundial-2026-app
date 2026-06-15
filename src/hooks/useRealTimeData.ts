/**
 * Custom Hook - useRealTimeData
 * Handles automatic data synchronization with real FIFA World Cup 2026 data
 * Features:
 * - Auto-sync on app load
 * - Periodic polling (every 30 seconds when visible)
 * - Manual refresh capability
 * - Connection detection (online/offline)
 * - Graceful error handling
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkInternetConnection, getRealMatchData } from '../services/realDataService';
import type { MatchDTO } from '../types';

interface UseRealTimeDataOptions {
  autoSync?: boolean;
  pollInterval?: number; // milliseconds, default 30000 (30 seconds)
  onError?: (error: Error) => void;
}

interface UseRealTimeDataReturn {
  matches: MatchDTO[];
  isLoading: boolean;
  isOnline: boolean;
  lastUpdate: string;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useRealTimeData = (options: UseRealTimeDataOptions = {}): UseRealTimeDataReturn => {
  const {
    autoSync = true,
    pollInterval = 30000,
    onError,
  } = options;

  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Fetch real data from APIs
   */
  const fetchRealData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      const realMatches = await getRealMatchData();

      if (isMountedRef.current) {
        setMatches(realMatches);
        setLastUpdate(new Date().toLocaleTimeString());
        setError(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error fetching real data');
      if (isMountedRef.current) {
        setError(error.message);
        onError?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [onError]);

  /**
   * Check internet connection and update status
   */
  const checkConnection = useCallback(async () => {
    try {
      const online = await checkInternetConnection();
      if (isMountedRef.current) {
        setIsOnline(online);
        if (online) {
          await fetchRealData();
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setIsOnline(false);
      }
    }
  }, [fetchRealData]);

  /**
   * Public refresh function
   */
  const refresh = useCallback(async () => {
    await checkConnection();
  }, [checkConnection]);

  /**
   * Setup initial sync and polling
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (autoSync) {
      // Initial fetch
      void checkConnection();

      // Setup polling
      intervalRef.current = setInterval(() => {
        void checkConnection();
      }, pollInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoSync, pollInterval, checkConnection]);

  /**
   * Listen for online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      if (isMountedRef.current) {
        setIsOnline(true);
        void fetchRealData();
      }
    };

    const handleOffline = () => {
      if (isMountedRef.current) {
        setIsOnline(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchRealData]);

  return {
    matches,
    isLoading,
    isOnline,
    lastUpdate,
    error,
    refresh,
  };
};
