import { useEffect, useMemo, useRef } from 'react';
import { STATUS_META, categoryStyle } from '../utils/constants.js';
import { formatHourLabel, formatTime12, nowMinutesInTz, timeToMinutes } from '../utils/date.js';
import useClock from '../hooks/useClock.js';
import cn from '../utils/cn.js';

const HOUR_PX = 64;

/** Assigns overlapping tasks to side-by-side lanes. */
export function layoutLanes(tasks) {
  const items = tasks
    .map((t) => ({ task: t, s: timeToMinutes(t.startTime), e: Math.max(timeToMinutes(t.endTime), timeToMinutes(t.startTime) + 15) }))
    .sort((a, b) => a.s - b.s || b.e - a.e);
  const groups = [];
  let current = [];
  let groupEnd = -1;
  for (const it of items) {
    if (current.length && it.s >= groupEnd) {
      groups.push(current);
      current = [];
    }
    current.push(it);
    groupEnd = Math.max(groupEnd, it.e);
  }
  if (current.length) groups.push(current);

  const out = [];
  for (const group of groups) {
    const laneEnds = [];
    const placed = group.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.s);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = it.e;
      return { ...it, lane };
    });
    placed.forEach((p) => out.push({ ...p, lanes: laneEnds.length }));
  }
  return out;
}

const STATUS_BLOCK = {
  COMPLETED: 'opacity-70',
  SKIPPED: 'opacity-50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(113,113,122,.12)_6px,rgba(113,113,122,.12)_12px)]',
  MISSED: 'ring-1 ring-rose-300 dark:ring-rose-500/40',
  ONGOING: 'ring-2 ring-sky-400 shadow-lift',
  UPCOMING: '',
};

/**
 * Vertical day timeline with an hour gutter, positioned task blocks and a live "now" line.
 */
export default function Timeline({ tasks, tz, isToday = true, onSelect }) {
  useClock(30000);
  const scrollRef = useRef(null);
  const nowMin = isToday ? nowMinutesInTz(tz) : null;

  const { startHour, endHour } = useMemo(() => {
    if (!tasks.length) return { startHour: 6, endHour: 23 };
    const minStart = Math.min(...tasks.map((t) => timeToMinutes(t.startTime)));
    const maxEnd = Math.max(...tasks.map((t) => timeToMinutes(t.endTime)));
    return {
      startHour: Math.max(0, Math.min(6, Math.floor(minStart / 60) - 1)),
      endHour: Math.min(24, Math.max(22, Math.ceil(maxEnd / 60) + 1)),
    };
  }, [tasks]);

  const blocks = useMemo(() => layoutLanes(tasks), [tasks]);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const height = (endHour - startHour) * HOUR_PX;
  const top = (mins) => ((mins - startHour * 60) / 60) * HOUR_PX;

  // Bring the current time (or first task) into view on mount.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const focus = nowMin ?? (blocks[0]?.s ?? startHour * 60);
    el.scrollTop = Math.max(0, top(focus) - 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startHour, blocks.length]);

  return (
    <div ref={scrollRef} className="scrollbar-thin relative max-h-[640px] overflow-y-auto pr-1">
      <div className="relative" style={{ height }}>
        {hours.map((h) => (
          <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: top(h * 60) }}>
            <span className="-mt-2 w-14 shrink-0 pr-3 text-right text-[11px] tabular-nums text-zinc-400">{h < 24 ? formatHourLabel(h) : ''}</span>
            <div className="flex-1 border-t border-dashed border-zinc-200 dark:border-zinc-800" />
          </div>
        ))}

        <div className="absolute bottom-0 left-14 right-0 top-0">
          {blocks.map(({ task, s, e, lane, lanes }) => {
            const style = categoryStyle(task.category);
            const status = STATUS_META[task.status] || STATUS_META.UPCOMING;
            const StatusIcon = status.icon;
            const h = Math.max(((e - s) / 60) * HOUR_PX - 3, 22);
            const width = 100 / (lanes || 1);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelect?.(task)}
                className={cn(
                  'absolute overflow-hidden rounded-lg border-l-4 px-2.5 py-1.5 text-left transition hover:z-10 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                  style.block,
                  style.bar,
                  STATUS_BLOCK[task.status]
                )}
                style={{ top: top(s) + 1, height: h, left: `calc(${lane * width}% + 4px)`, width: `calc(${width}% - 6px)` }}
                title={`${task.title} · ${formatTime12(task.startTime)}–${formatTime12(task.endTime)}`}
              >
                <div className="flex items-start gap-1.5">
                  <StatusIcon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', status.text, task.status === 'ONGOING' && 'animate-spin [animation-duration:3s]')} />
                  <div className="min-w-0">
                    <p className={cn('truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50', task.status === 'COMPLETED' && 'line-through')}>{task.title}</p>
                    {h > 34 && (
                      <p className="truncate text-[11px] text-zinc-600 dark:text-zinc-400">
                        {formatTime12(task.startTime)} – {formatTime12(task.endTime)} · {status.label}
                      </p>
                    )}
                    {h > 60 && task.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{task.description}</p>}
                  </div>
                </div>
              </button>
            );
          })}

          {nowMin != null && nowMin >= startHour * 60 && nowMin <= endHour * 60 && (
            <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: top(nowMin) }}>
              <span className="-ml-1.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500 dark:border-zinc-900" />
              <span className="h-0.5 flex-1 bg-rose-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
