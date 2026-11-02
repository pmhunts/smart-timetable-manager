import { useMemo } from 'react';
import { STATUS_META, categoryStyle } from '../../utils/constants.js';
import { WEEKDAYS, formatTime12, monthGrid } from '../../utils/date.js';
import cn from '../../utils/cn.js';

const MAX_CHIPS = 3;

export default function MonthView({ anchor, tasks, today, onSelectTask, onSelectDay }) {
  const cells = monthGrid(anchor);
  const month = anchor.slice(0, 7);
  const byDay = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      (map[t.scheduleDate] = map[t.scheduleDate] || []).push(t);
    });
    return map;
  }, [tasks]);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {WEEKDAYS.map((d) => (
          <p key={d.value} className="text-center text-[11px] font-medium uppercase text-zinc-500">
            <span className="hidden sm:inline">{d.short}</span>
            <span className="sm:hidden">{d.short[0]}</span>
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const list = byDay[d] || [];
          const inMonth = d.slice(0, 7) === month;
          const done = list.filter((t) => t.status === 'COMPLETED').length;
          return (
            <div
              key={d}
              className={cn(
                'min-h-[64px] border-b border-r border-zinc-100 p-1 sm:min-h-[108px] sm:p-1.5 dark:border-zinc-800',
                !inMonth && 'bg-zinc-50/70 dark:bg-zinc-900/50',
                d < today && inMonth && 'bg-zinc-50/40 dark:bg-zinc-900/30'
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(d)}
                className={cn(
                  'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  !inMonth && 'text-zinc-400',
                  d === today && 'bg-accent-600 text-white hover:bg-accent-700'
                )}
              >
                {Number(d.slice(8))}
              </button>

              {/* Compact dots on phones */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {list.slice(0, 6).map((t) => (
                  <span key={t.id} className={cn('h-1.5 w-1.5 rounded-full', categoryStyle(t.category).dot)} />
                ))}
              </div>

              <div className="hidden space-y-0.5 sm:block">
                {list.slice(0, MAX_CHIPS).map((t) => {
                  const Icon = (STATUS_META[t.status] || STATUS_META.UPCOMING).icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTask(t)}
                      className={cn(
                        'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] transition hover:brightness-95',
                        categoryStyle(t.category).soft,
                        (t.status === 'COMPLETED' || t.status === 'SKIPPED') && 'opacity-60 line-through'
                      )}
                      title={`${formatTime12(t.startTime)} ${t.title}`}
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
                {list.length > MAX_CHIPS && (
                  <button type="button" onClick={() => onSelectDay(d)} className="px-1 text-[11px] font-medium text-zinc-500 hover:text-accent-600">
                    +{list.length - MAX_CHIPS} more
                  </button>
                )}
                {list.length > 0 && d < today && (
                  <p className="px-1 text-[10px] text-zinc-400">
                    {done}/{list.length} done
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
