/**
 * Connection Monitor Service
 * Monitors internet connectivity and triggers data updates
 */

type ConnectionListener = (isOnline: boolean) => void;

class ConnectionMonitor {
  private listeners: Set<ConnectionListener> = new Set();
  private isOnline: boolean = navigator.onLine;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5000; // Check every 5 seconds

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for online/offline
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Handle going online
   */
  private handleOnline(): void {
    if (!this.isOnline) {
      console.log('🟢 Connection restored');
      this.isOnline = true;
      this.notifyListeners(true);
    }
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    if (this.isOnline) {
      console.log('🔴 Connection lost');
      this.isOnline = false;
      this.notifyListeners(false);
    }
  }

  /**
   * Start periodic connection checks
   */
  public startMonitoring(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      const isCurrentlyOnline = navigator.onLine;
      if (isCurrentlyOnline !== this.isOnline) {
        if (isCurrentlyOnline) {
          this.handleOnline();
        } else {
          this.handleOffline();
        }
      }
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop periodic connection checks
   */
  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Add listener for connection changes
   */
  public addListener(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }

  /**
   * Get current connection status
   */
  public isConnected(): boolean {
    return this.isOnline;
  }
}

export const connectionMonitor = new ConnectionMonitor();
