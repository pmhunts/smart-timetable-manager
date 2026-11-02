import useCountdown from '../hooks/useCountdown.js';
import cn from '../utils/cn.js';

/** Large ticking HH:MM:SS display towards an ISO instant. */
export default function CountdownTimer({ target, offsetMs = 0, className }) {
  const seconds = useCountdown(target, offsetMs);
  if (seconds == null) return <span className={cn('font-mono text-2xl text-zinc-400', className)}>--:--:--</span>;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <span className={cn('font-mono text-2xl font-semibold tabular-nums tracking-tight', className)}>
      {d > 0 && <>{d}d </>}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
