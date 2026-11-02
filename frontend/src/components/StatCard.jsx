import cn from '../utils/cn.js';

const TONES = {
  indigo: 'bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-300',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  blue: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
  red: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
  zinc: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
};

export default function StatCard({ label, value, icon: Icon, tone = 'indigo', hint, loading }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-zinc-500">{label}</p>
        {loading ? (
          <div className="mt-1 h-6 w-10 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        )}
        {hint && <p className="truncate text-[11px] text-zinc-400">{hint}</p>}
      </div>
    </div>
  );
}
