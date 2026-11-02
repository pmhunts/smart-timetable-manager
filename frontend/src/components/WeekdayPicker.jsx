import { WEEKDAYS } from '../utils/date.js';
import cn from '../utils/cn.js';

/** Toggle chips for ISO weekdays (1 = Mon … 7 = Sun). */
export default function WeekdayPicker({ value = [], onChange, disabled, error }) {
  const toggle = (day) => {
    const set = new Set(value);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onChange([...set].sort((a, b) => a - b));
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((d) => {
          const active = value.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(d.value)}
              aria-pressed={active}
              className={cn(
                'h-8 min-w-[2.75rem] rounded-lg border px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
                active
                  ? 'border-accent-600 bg-accent-600 text-white'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
              )}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
