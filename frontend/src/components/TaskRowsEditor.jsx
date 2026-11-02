import { useState } from 'react';
import { AlertTriangle, ArrowDownUp, ChevronDown, Copy, Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button.jsx';
import TaskFields from './TaskFields.jsx';
import { CategoryTag } from './StatusBadge.jsx';
import { categoryStyle } from '../utils/constants.js';
import { durationLabel, formatTime12, minutesToTime, timeToMinutes } from '../utils/date.js';
import { emptyTask, findLocalOverlaps } from '../utils/task.js';
import cn from '../utils/cn.js';

/**
 * Editable list of task rows for a whole timetable.
 * `rows` items are form values (see utils/task.js); `errors` is { [rowKey]: { field: msg } }.
 */
export default function TaskRowsEditor({ rows, onChange, errors = {}, disabled = false }) {
  const [expanded, setExpanded] = useState(() => new Set(rows.filter((r) => !r.title).map((r) => r._key)));
  const overlaps = findLocalOverlaps(rows);

  const toggle = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const update = (key, patch) => onChange(rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  const remove = (key) => onChange(rows.filter((r) => r._key !== key));

  const addRow = () => {
    // Start the new task where the latest one ends.
    const lastEnd = rows.reduce((max, r) => Math.max(max, timeToMinutes(r.endTime)), 8 * 60);
    const start = Math.min(lastEnd, 22 * 60);
    const row = emptyTask({ startTime: minutesToTime(start), endTime: minutesToTime(Math.min(start + 60, 23 * 60 + 59)) });
    onChange([...rows, row]);
    setExpanded((prev) => new Set(prev).add(row._key));
  };

  const duplicateRow = (row) => {
    const copy = { ...row, id: undefined, _key: Math.random().toString(36).slice(2), title: `${row.title} (copy)` };
    const idx = rows.findIndex((r) => r._key === row._key);
    onChange([...rows.slice(0, idx + 1), copy, ...rows.slice(idx + 1)]);
    setExpanded((prev) => new Set(prev).add(copy._key));
  };

  const sortRows = () => onChange([...rows].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)));

  return (
    <div className="space-y-3">
      {rows.length > 1 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="xs" icon={ArrowDownUp} onClick={sortRows} disabled={disabled}>
            Sort by time
          </Button>
        </div>
      )}

      {rows.map((row, idx) => {
        const open = expanded.has(row._key);
        const rowErrors = errors[row._key] || {};
        const hasError = Object.keys(rowErrors).length > 0;
        const overlapping = overlaps.has(idx);
        return (
          <div
            key={row._key}
            className={cn(
              'overflow-hidden rounded-xl border border-l-4 bg-white transition dark:bg-zinc-900',
              categoryStyle(row.category).bar,
              hasError ? 'border-rose-300 dark:border-rose-500/40' : 'border-zinc-200 dark:border-zinc-800'
            )}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <button type="button" onClick={() => toggle(row._key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="w-6 shrink-0 text-xs font-medium tabular-nums text-zinc-400">{idx + 1}</span>
                <div className="w-32 shrink-0">
                  <p className="text-sm font-semibold tabular-nums">{formatTime12(row.startTime) || '--'}</p>
                  <p className="text-xs text-zinc-500">
                    to {formatTime12(row.endTime) || '--'} {durationLabel(row.startTime, row.endTime) && `· ${durationLabel(row.startTime, row.endTime)}`}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate text-sm font-medium', !row.title && 'italic text-zinc-400')}>{row.title || 'Untitled task'}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <CategoryTag category={row.category} />
                    {overlapping && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3" /> Overlaps
                      </span>
                    )}
                    {hasError && <span className="text-[11px] font-medium text-rose-600">Needs attention</span>}
                  </div>
                </div>
                <ChevronDown className={cn('h-4 w-4 shrink-0 text-zinc-400 transition-transform', open && 'rotate-180')} />
              </button>
              {!disabled && (
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon-sm" icon={Copy} onClick={() => duplicateRow(row)} title="Duplicate row" aria-label="Duplicate row" />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    icon={Trash2}
                    onClick={() => remove(row._key)}
                    className="hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/10"
                    title="Remove row"
                    aria-label="Remove row"
                  />
                </div>
              )}
            </div>
            {open && (
              <div className="border-t border-zinc-100 bg-zinc-50/50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                <TaskFields value={row} onChange={(patch) => update(row._key, patch)} errors={rowErrors} disabled={disabled} />
              </div>
            )}
          </div>
        );
      })}

      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 py-3 text-sm font-medium text-zinc-500 transition hover:border-accent-400 hover:bg-accent-50/50 hover:text-accent-700 dark:border-zinc-700 dark:hover:border-accent-500/50 dark:hover:bg-accent-500/5 dark:hover:text-accent-300"
        >
          <Plus className="h-4 w-4" /> Add task
        </button>
      )}
    </div>
  );
}
