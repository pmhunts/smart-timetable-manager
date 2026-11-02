import { formatDate } from '../utils/date.js';
import cn from '../utils/cn.js';

/** Stacked daily bars: completed / missed / skipped / remaining, scaled to the busiest day. */
export default function WeeklyChart({ days = [], today }) {
  const max = Math.max(1, ...days.map((d) => d.total || 0));
  return (
    <div>
      <div className="flex h-36 items-end gap-2 sm:gap-3">
        {days.map((d) => {
          const total = d.total || 0;
          const other = Math.max(0, total - (d.completed || 0) - (d.missed || 0) - (d.skipped || 0));
          const seg = (n) => `${(n / max) * 100}%`;
          return (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <div className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] text-white shadow group-hover:block dark:bg-zinc-700">
                {d.completed}/{total} done · {Math.round(d.completionRate || 0)}%
              </div>
              <div className="flex w-full max-w-[28px] flex-col-reverse overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800" style={{ height: total ? seg(total) : '6px' }}>
                <div className="bg-accent-500" style={{ height: `${total ? (d.completed / total) * 100 : 0}%` }} />
                <div className="bg-rose-400" style={{ height: `${total ? (d.missed / total) * 100 : 0}%` }} />
                <div className="bg-zinc-400" style={{ height: `${total ? (d.skipped / total) * 100 : 0}%` }} />
                <div className="bg-accent-200 dark:bg-accent-500/30" style={{ height: `${total ? (other / total) * 100 : 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {days.map((d) => (
          <p key={d.date} className={cn('flex-1 text-center text-[11px] text-zinc-500', d.date === today && 'font-semibold text-accent-600 dark:text-accent-400')}>
            {formatDate(d.date, { weekday: 'short' })}
          </p>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-zinc-500">
        {[
          ['bg-accent-500', 'Completed'],
          ['bg-rose-400', 'Missed'],
          ['bg-zinc-400', 'Skipped'],
          ['bg-accent-200 dark:bg-accent-500/30', 'Pending'],
        ].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-sm', c)} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}
