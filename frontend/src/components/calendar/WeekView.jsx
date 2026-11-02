import { useMemo } from 'react';
import { layoutLanes } from '../Timeline.jsx';
import { STATUS_META, categoryStyle } from '../../utils/constants.js';
import { addDays, formatDate, formatHourLabel, formatTime12, nowMinutesInTz, timeToMinutes } from '../../utils/date.js';
import cn from '../../utils/cn.js';

const HOUR_PX = 48;

export default function WeekView({ start, tasks, today, tz, onSelectTask, onSelectDay }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const byDay = useMemo(() => {
    const map = Object.fromEntries(days.map((d) => [d, []]));
    tasks.forEach((t) => map[t.scheduleDate]?.push(t));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, start]);

  const { startHour, endHour } = useMemo(() => {
    if (!tasks.length) return { startHour: 6, endHour: 22 };
    const minS = Math.min(...tasks.map((t) => timeToMinutes(t.startTime)));
    const maxE = Math.max(...tasks.map((t) => timeToMinutes(t.endTime)));
    return { startHour: Math.max(0, Math.min(6, Math.floor(minS / 60))), endHour: Math.min(24, Math.max(22, Math.ceil(maxE / 60))) };
  }, [tasks]);

  const top = (m) => ((m - startHour * 60) / 60) * HOUR_PX;
  const height = (endHour - startHour) * HOUR_PX;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const nowMin = nowMinutesInTz(tz);

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-zinc-200 dark:border-zinc-800">
          <div />
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDay(d)}
              className={cn('py-2 text-center transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50', d < today && 'opacity-60')}
            >
              <p className="text-[11px] font-medium uppercase text-zinc-500">{formatDate(d, { weekday: 'short' })}</p>
              <p
                className={cn(
                  'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                  d === today && 'bg-accent-600 text-white'
                )}
              >
                {Number(d.slice(8))}
              </p>
            </button>
          ))}
        </div>

        <div className="scrollbar-thin max-h-[620px] overflow-y-auto">
          <div className="relative grid grid-cols-[56px_repeat(7,1fr)]" style={{ height }}>
            <div className="relative">
              {hours.map((h) => (
                <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-zinc-400" style={{ top: top(h * 60) }}>
                  {h === startHour ? '' : formatHourLabel(h)}
                </span>
              ))}
            </div>
            {days.map((d) => (
              <div key={d} className={cn('relative border-l border-zinc-100 dark:border-zinc-800', d < today && 'bg-zinc-50/60 dark:bg-zinc-900/40')}>
                {hours.map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-800/70" style={{ top: top(h * 60) }} />
                ))}
                {layoutLanes(byDay[d] || []).map(({ task, s, e, lane, lanes }) => {
                  const style = categoryStyle(task.category);
                  const status = STATUS_META[task.status] || STATUS_META.UPCOMING;
                  const Icon = status.icon;
                  const w = 100 / lanes;
                  const h = Math.max(((e - s) / 60) * HOUR_PX - 2, 18);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onSelectTask(task)}
                      title={`${task.title} · ${formatTime12(task.startTime)}–${formatTime12(task.endTime)} · ${status.label}`}
                      className={cn(
                        'absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left transition hover:z-10 hover:shadow-lift',
                        style.block,
                        style.bar,
                        (task.status === 'COMPLETED' || task.status === 'SKIPPED') && 'opacity-60',
                        task.status === 'MISSED' && 'ring-1 ring-rose-300 dark:ring-rose-500/40'
                      )}
                      style={{ top: top(s) + 1, height: h, left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)` }}
                    >
                      <p className={cn('flex items-center gap-1 truncate text-[11px] font-semibold', task.status === 'COMPLETED' && 'line-through')}>
                        <Icon className={cn('h-3 w-3 shrink-0', status.text)} />
                        <span className="truncate">{task.title}</span>
                      </p>
                      {h > 30 && <p className="truncate text-[10px] text-zinc-500">{formatTime12(task.startTime)}</p>}
                    </button>
                  );
                })}
                {d === today && nowMin >= startHour * 60 && nowMin <= endHour * 60 && (
                  <div className="pointer-events-none absolute left-0 right-0 z-20 h-0.5 bg-rose-500" style={{ top: top(nowMin) }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
