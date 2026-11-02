import { Lock } from 'lucide-react';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useCountdown from '../hooks/useCountdown.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { formatCountdown, formatInstant } from '../utils/date.js';
import { LOCKED_MESSAGE } from '../utils/errors.js';
import cn from '../utils/cn.js';

/** Read-only notice shown while the editing window is closed. Renders nothing when unlocked. */
export default function LockBanner({ compact = false, className }) {
  const { state, isLocked, clockOffset } = useEditingWindow();
  const { tz } = useUserTimezone();
  const nextOpen = state?.nextWindow?.opensAt;
  const seconds = useCountdown(nextOpen, clockOffset);

  if (!isLocked) return null;

  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100',
        compact ? 'p-3 text-sm' : 'p-4',
        className
      )}
      role="status"
    >
      <div className={cn('flex shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300', compact ? 'h-7 w-7' : 'h-9 w-9')}>
        <Lock className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className={cn('font-medium', !compact && 'text-sm')}>{LOCKED_MESSAGE}</p>
        <p className="mt-0.5 text-xs text-rose-700/80 dark:text-rose-200/70">
          {nextOpen ? (
            <>
              Next window opens {formatInstant(nextOpen, tz, { weekday: 'short' })} — in{' '}
              <span className="font-mono tabular-nums">{formatCountdown(seconds)}</span>. Your timetable is in read-only mode;
              you can still mark tasks complete or skipped.
            </>
          ) : (
            'No upcoming editing window is configured. Your timetable is in read-only mode.'
          )}
        </p>
      </div>
    </div>
  );
}
