import useClock from './useClock.js';

/**
 * Seconds remaining until `targetIso`, ticking every second.
 * `offsetMs` = serverTime - browserTime, so countdowns follow the server clock.
 */
export default function useCountdown(targetIso, offsetMs = 0) {
  const now = useClock(1000);
  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - (now.getTime() + offsetMs);
  return Math.max(0, Math.floor(diff / 1000));
}
