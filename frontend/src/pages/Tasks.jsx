import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, ListChecks, Percent, Plus, Search, XCircle } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import SegmentedControl from '../components/ui/SegmentedControl.jsx';
import { SkeletonList } from '../components/ui/Skeleton.jsx';
import LockBanner from '../components/LockBanner.jsx';
import StatCard from '../components/StatCard.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskModals from '../components/TaskModals.jsx';
import { taskService } from '../services/taskService.js';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useAsync from '../hooks/useAsync.js';
import useDebounce from '../hooks/useDebounce.js';
import useTaskModals from '../hooks/useTaskModals.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { CATEGORIES } from '../utils/constants.js';
import { addDays, diffDays, formatDateLong } from '../utils/date.js';

const TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'UPCOMING,ONGOING', label: 'Pending' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'MISSED', label: 'Missed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'SKIPPED', label: 'Skipped' },
];

export default function Tasks() {
  const { today } = useUserTimezone();
  const { isLocked } = useEditingWindow();
  const [status, setStatus] = useState('ALL');
  const [range, setRange] = useState({ from: addDays(today, -7), to: addDays(today, 7) });
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());

  const rangeValid = range.from && range.to && range.to >= range.from && diffDays(range.to, range.from) <= 62;

  const { data, loading, reload } = useAsync(
    () =>
      rangeValid
        ? taskService.list({
            from: range.from,
            to: range.to,
            status: status === 'ALL' ? undefined : status,
            category: category || undefined,
            search: debouncedSearch || undefined,
            limit: 1000,
          })
        : Promise.resolve({ items: [] }),
    [range.from, range.to, status, category, debouncedSearch, rangeValid]
  );
  const stats = useAsync(() => taskService.stats(7), []);

  const silentReload = useCallback(() => {
    reload({ silent: true });
    stats.reload({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, stats.reload]);
  const modals = useTaskModals(silentReload);

  const grouped = useMemo(() => {
    const map = new Map();
    (data?.items || []).forEach((t) => {
      if (!map.has(t.scheduleDate)) map.set(t.scheduleDate, []);
      map.get(t.scheduleDate).push(t);
    });
    return [...map.entries()];
  }, [data]);

  const preset = (from, to) => setRange({ from, to });
  const totals = stats.data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="page-title">Tasks</h2>
          <p className="text-sm text-zinc-500">Track pending, missed and completed tasks across days.</p>
        </div>
        <Button icon={Plus} onClick={() => modals.openEdit(null)} disabled={isLocked}>
          New task
        </Button>
      </div>

      <LockBanner />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tasks (7 days)" value={totals?.total ?? 0} icon={ListChecks} loading={stats.loading} />
        <StatCard label="Completed" value={totals?.completed ?? 0} icon={CheckCircle2} tone="green" loading={stats.loading} />
        <StatCard label="Missed" value={totals?.missed ?? 0} icon={XCircle} tone="red" loading={stats.loading} />
        <StatCard label="Completion rate" value={`${Math.round(totals?.completionRate ?? 0)}%`} icon={Percent} tone="amber" loading={stats.loading} />
      </div>

      <div className="card space-y-4 p-4">
        <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
          <SegmentedControl options={TABS} value={status} onChange={setStatus} size="sm" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          <Input
            label="To"
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            error={!rangeValid ? 'Range must be 0–62 days' : undefined}
          />
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES}>
            <option value="">All categories</option>
          </Select>
          <Input label="Search" icon={Search} placeholder="Title or description" value={search} onChange={(e) => setSearch(e.target.value)} className="lg:col-span-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="xs" onClick={() => preset(today, today)}>
            Today
          </Button>
          <Button variant="ghost" size="xs" onClick={() => preset(today, addDays(today, 6))}>
            Next 7 days
          </Button>
          <Button variant="ghost" size="xs" onClick={() => preset(addDays(today, -6), today)}>
            Last 7 days
          </Button>
          <Button variant="ghost" size="xs" onClick={() => preset(addDays(today, -29), today)}>
            Last 30 days
          </Button>
        </div>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : grouped.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ListChecks}
            title="No tasks found"
            description="Try a different filter or date range."
            action={
              !isLocked && (
                <Button icon={Plus} onClick={() => modals.openEdit(null)}>
                  Add a task
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <section key={date}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {formatDateLong(date)}
                {date === today && <span className="rounded bg-accent-100 px-1.5 text-[11px] text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">Today</span>}
                <span className="text-xs font-normal text-zinc-400">· {items.length}</span>
              </h3>
              <div className="space-y-2.5">
                {items.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onOpen={modals.openDetail}
                    onStatusChange={date <= today ? modals.onStatusChange : undefined}
                    onEdit={modals.openEdit}
                    onDelete={modals.askDelete}
                    editable={!isLocked && date >= today}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <TaskModals modals={modals} defaultDate={today} onSaved={silentReload} />
    </div>
  );
}
