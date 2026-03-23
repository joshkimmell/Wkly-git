/**
 * focusNotify.ts
 * Sound + browser notification helpers for the Pomodoro timer.
 */

// ── Browser notification ──────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendFocusNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/images/icon-192.png',
      badge: '/images/icon-192.png',
      tag: 'wkly-focus-timer',
      renotify: true,
    });
    // Auto-close after 8 s
    setTimeout(() => n.close(), 8000);
  } catch {
    /* non-critical */
  }
}

// ── Audio synthesis ───────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

/**
 * Play a short "tada" sound using Web Audio API.
 * Three rising notes played in quick succession.
 */
export function playTadaSound(): void {
  try {
    const ctx = getAudioCtx();

    // Resume context (may be suspended after user gesture requirement)
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    const notes: Array<{ freq: number; start: number; dur: number; vol: number }> = [
      { freq: 523.25, start: 0,    dur: 0.12, vol: 0.25 }, // C5
      { freq: 659.25, start: 0.13, dur: 0.12, vol: 0.25 }, // E5
      { freq: 783.99, start: 0.26, dur: 0.28, vol: 0.35 }, // G5
    ];

    notes.forEach(({ freq, start, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.start(now + start);
      osc.stop(now + start + dur + 0.01);
    });
  } catch {
    /* non-critical — older browsers */
  }
}

/**
 * Play a softer "ding" for break-end (return to focus).
 */
export function playBreakEndSound(): void {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch { /* non-critical */ }
}
