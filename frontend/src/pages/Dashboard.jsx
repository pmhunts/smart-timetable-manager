import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Hourglass,
  LayoutList,
  ListTodo,
  Plus,
  RefreshCw,
  Rows3,
  Sparkles,
  XCircle,
} from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import SegmentedControl from '../components/ui/SegmentedControl.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import StatCard from '../components/StatCard.jsx';
import ProgressRing from '../components/ProgressRing.jsx';
import Timeline from '../components/Timeline.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskStatusActions from '../components/TaskStatusActions.jsx';
import WeeklyChart from '../components/WeeklyChart.jsx';
import EditingWindowCard from '../components/EditingWindowCard.jsx';
import NotificationStatusCard from '../components/NotificationStatusCard.jsx';
import TaskModals from '../components/TaskModals.jsx';
import { CategoryTag, StatusBadge } from '../components/StatusBadge.jsx';
import { dashboardService } from '../services/dashboardService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useAsync from '../hooks/useAsync.js';
import useClock from '../hooks/useClock.js';
import useTaskModals from '../hooks/useTaskModals.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { formatDateLong, formatTime12, greeting, zonedParts } from '../utils/date.js';

function Header({ name, tz, isLocked, onNewTask }) {
  const now = useClock(1000);
  const parts = zonedParts(now, tz);
  const time = now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-zinc-500">{formatDateLong(parts.date)}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting(parts.hour)}, {name?.split(' ')[0]} <span className="inline-block">👋</span>
        </h2>
        <p className="mt-1 font-mono text-sm tabular-nums text-zinc-500">{time}</p>
      </div>
      <div className="flex gap-2">
        <Button to="/timetable/new" variant="secondary" icon={CalendarCheck2} disabled={isLocked}>
          Create timetable
        </Button>
        <Button icon={Plus} onClick={onNewTask} disabled={isLocked} title={isLocked ? 'Editing window closed' : undefined}>
          New task
        </Button>
      </div>
    </div>
  );
}

function NextTaskCard({ task, onStatusChange }) {
  if (!task) {
    return (
      <div className="card flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">You&apos;re all caught up</p>
          <p className="text-xs text-zinc-500">No more tasks scheduled for today.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-accent-600 to-violet-600 p-5 text-white shadow-lift">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      <p className="text-xs font-medium uppercase tracking-wider text-white/70">{task.status === 'ONGOING' ? 'Happening now' : 'Up next'}</p>
      <p className="mt-1 text-lg font-semibold">{task.title}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/80">
        <Clock className="h-3.5 w-3.5" /> {formatTime12(task.startTime)} – {formatTime12(task.endTime)}
      </p>
      {task.description && <p className="mt-2 line-clamp-2 text-sm text-white/70">{task.description}</p>}
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs">{task.category}</span>
        <div className="[&_button]:!bg-white/15 [&_button]:!text-white hover:[&_button]:!bg-white/25">
          <TaskStatusActions task={task} onChange={onStatusChange} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { tz, today } = useUserTimezone();
  const { isLocked, applyState } = useEditingWindow();
  const [view, setView] = useState('timeline');
  const { data, loading, error, reload } = useAsync(() => dashboardService.get(), []);

  const silentReload = useCallback(() => reload({ silent: true }), [reload]);
  const modals = useTaskModals(silentReload);

  useEffect(() => {
    if (data?.editingWindow) applyState(data.editingWindow);
  }, [data, applyState]);

  // Statuses advance with the clock (upcoming → ongoing → missed); refresh every minute.
  useEffect(() => {
    const id = setInterval(silentReload, 60_000);
    return () => clearInterval(id);
  }, [silentReload]);

  const stats = data?.stats || {};
  const tasks = data?.tasks || [];
  const completion = stats.total ? (stats.completed / stats.total) * 100 : 0;
  const tzForView = data?.user?.timezone || tz;

  return (
    <div className="space-y-6">
      <Header name={user?.name} tz={tzForView} isLocked={isLocked} onNewTask={() => modals.openEdit(null)} />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </span>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => reload()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total tasks today" value={stats.total ?? 0} icon={ListTodo} tone="indigo" loading={loading} />
        <StatCard label="Completed" value={stats.completed ?? 0} icon={CheckCircle2} tone="green" loading={loading} />
        <StatCard label="Pending" value={stats.pending ?? 0} icon={Hourglass} tone="amber" loading={loading} hint={`${stats.ongoing ?? 0} ongoing`} />
        <StatCard label="Upcoming" value={stats.upcoming ?? 0} icon={Clock} tone="blue" loading={loading} />
        <StatCard label="Missed" value={stats.missed ?? 0} icon={XCircle} tone="red" loading={loading} hint={stats.skipped ? `${stats.skipped} skipped` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card
            title="Today's Timetable"
            description={data?.timetable ? `${data.timetable.title} · ${formatDateLong(data.today || today)}` : formatDateLong(data?.today || today)}
            icon={CalendarCheck2}
            actions={
              <SegmentedControl
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: 'timeline', label: <Rows3 className="h-3.5 w-3.5" /> },
                  { value: 'list', label: <LayoutList className="h-3.5 w-3.5" /> },
                ]}
              />
            }
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-24" />
                <Skeleton className="h-16" />
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={CalendarCheck2}
                title="Nothing scheduled today"
                description={isLocked ? 'Your editing window is closed. You can plan your day during the next window.' : 'Plan your day by creating a timetable or adding a task.'}
                action={
                  !isLocked && (
                    <Button to="/timetable/new" icon={Plus}>
                      Create timetable
                    </Button>
                  )
                }
              />
            ) : view === 'timeline' ? (
              <Timeline tasks={tasks} tz={tzForView} isToday onSelect={modals.openDetail} />
            ) : (
              <div className="space-y-2.5">
                {tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onOpen={modals.openDetail}
                    onStatusChange={modals.onStatusChange}
                    onEdit={modals.openEdit}
                    onDelete={modals.askDelete}
                    editable={!isLocked}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card
            title="This week"
            description="Daily completion over the last 7 days"
            actions={
              <Link to="/tasks" className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline dark:text-accent-400">
                All tasks <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            {loading ? <Skeleton className="h-40" /> : <WeeklyChart days={data?.weekly || []} today={data?.today || today} />}
          </Card>
        </div>

        <div className="space-y-6">
          {loading ? <Skeleton className="h-40" /> : <NextTaskCard task={data?.nextTask} onStatusChange={modals.onStatusChange} />}

          <Card title="Today's progress">
            <div className="flex items-center gap-5">
              <ProgressRing value={completion} sublabel="complete" />
              <div className="flex-1 space-y-2 text-sm">
                {[
                  ['COMPLETED', stats.completed],
                  ['ONGOING', stats.ongoing],
                  ['UPCOMING', stats.upcoming],
                  ['MISSED', stats.missed],
                  ['SKIPPED', stats.skipped],
                ].map(([s, n]) => (
                  <div key={s} className="flex items-center justify-between">
                    <StatusBadge status={s} />
                    <span className="font-medium tabular-nums">{n ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <EditingWindowCard />
          <NotificationStatusCard notifications={data?.notifications} loading={loading} />

          {tasks.length > 0 && (
            <Card title="Categories today">
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(tasks.map((t) => t.category))].map((c) => (
                  <CategoryTag key={c} category={c} />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <TaskModals modals={modals} defaultDate={data?.today || today} onSaved={silentReload} />
    </div>
  );
}
