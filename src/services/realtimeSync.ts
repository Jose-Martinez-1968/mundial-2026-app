type SyncOptions = {
  onStatusChange: (online: boolean) => void;
  onSync: () => void | Promise<void>;
  intervalMs?: number;
};

export const createRealtimeSync = ({
  onStatusChange,
  onSync,
  intervalMs = 30000,
}: SyncOptions): (() => void) => {
  const hasNavigator = typeof navigator !== 'undefined';
  const hasWindow = typeof window !== 'undefined';
  if (!hasWindow) return () => undefined;

  let syncing = false;

  const runSync = async () => {
    if (hasNavigator && !navigator.onLine) return;
    if (syncing) return;

    syncing = true;
    try {
      await onSync();
    } finally {
      syncing = false;
    }
  };

  const handleOnline = () => {
    onStatusChange(true);
    void runSync();
  };

  const handleOffline = () => {
    onStatusChange(false);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void runSync();
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const interval = window.setInterval(() => {
    void runSync();
  }, intervalMs);

  onStatusChange(hasNavigator ? navigator.onLine : true);
  void runSync();

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.clearInterval(interval);
  };
};

