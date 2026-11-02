import { Infinity as InfinityIcon, Lock, Unlock } from 'lucide-react';
import CountdownTimer from './CountdownTimer.jsx';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { formatInstant } from '../utils/date.js';
import cn from '../utils/cn.js';

/** Locked/unlocked state with a live countdown to closing (or to the next opening). */
export default function EditingWindowStatus({ className }) {
  const { state, clockOffset } = useEditingWindow();
  const { tz } = useUserTimezone();
  if (!state) return null;

  if (!state.enabled) {
    return (
      <div className={cn('flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50', className)}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
          <InfinityIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Unlocked · no restriction</p>
          <p className="text-xs text-zinc-500">The editing window is disabled, so you can edit your timetable any time.</p>
        </div>
      </div>
    );
  }

  const open = state.isOpen;
  const target = open ? state.currentWindow?.closesAt : state.nextWindow?.opensAt;

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        open
          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5'
          : 'border-rose-200 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
            open ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
          )}
        >
          {open ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {open ? 'Unlocked' : 'Locked'}
        </span>
        <span className="text-xs text-zinc-500">{open ? 'Closes' : 'Opens'} {formatInstant(target, tz, { weekday: 'short' })}</span>
      </div>
      <p className="mt-3 text-xs font-medium text-zinc-500">{open ? 'Time remaining to create / update timetable' : 'Time until next editing window'}</p>
      <CountdownTimer target={target} offsetMs={clockOffset} className={open ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'} />
      {open && state.currentWindow && (
        <p className="mt-1 text-xs text-zinc-500">
          Window: {formatInstant(state.currentWindow.opensAt, tz, { month: undefined, day: undefined })} – {formatInstant(state.currentWindow.closesAt, tz, { month: undefined, day: undefined })}
        </p>
      )}
    </div>
  );
}
