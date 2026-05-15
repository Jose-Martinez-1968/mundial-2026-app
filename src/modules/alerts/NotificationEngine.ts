import type { MatchDTO } from '../../types';

export class NotificationEngine {
  private static notifiedMatches = new Set<string>();

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones de escritorio.');
      return false;
    }
    
    if (Notification.permission === 'granted') return true;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  static checkMatchesAndNotify(matches: MatchDTO[]) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const now = new Date().getTime();
    const TEN_MINUTES_MS = 10 * 60 * 1000;

    matches.forEach(match => {
      if (
        !match.utcDateString ||
        match.kickoffStatus === 'date-only' ||
        match.status === 'LIVE' ||
        match.status === 'FINISHED'
      ) {
        return;
      }
      if (this.notifiedMatches.has(match.matchId)) return;

      const matchTime = new Date(match.utcDateString).getTime();
      const timeDiff = matchTime - now;

      // Si falta <= 10 minutos y > 0
      if (timeDiff > 0 && timeDiff <= TEN_MINUTES_MS) {
        this.notifiedMatches.add(match.matchId);
        
        const title = `¡Es hora! ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'}`;
        const options = {
          body: `El partido está por comenzar en menos de 10 minutos en el estadio ${match.stadium}.`,
          icon: '/favicon.ico', // Idealmente el logo del Mundial o tu app
          vibrate: [200, 100, 200, 100, 200, 100, 200],
        };

        try {
          // Play a native beep/alarm sound using Web Audio API if we want true "alarms",
          // but relying on native push notifications also usually triggers device alerts.
          new Notification(title, options);
          this.playAlarmSound();
        } catch (error) {
          console.error("Error lanzando la notificación: ", error);
        }
      }
    });
  }

  // Genera un ligero "beep" interno para asegurar la atención del usuario
  private static playAlarmSound() {
    try {
      const AudioContext = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime); // Bajo volumen
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5); // medio segundo
    } catch {
      // Silencioso en caso de bloqueo por navegadores sin interacción previa
    }
  }
}
