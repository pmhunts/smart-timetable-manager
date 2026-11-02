import { useCallback, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import SegmentedControl from '../components/ui/SegmentedControl.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Timeline from '../components/Timeline.jsx';
import TaskModals from '../components/TaskModals.jsx';
import WeekView from '../components/calendar/WeekView.jsx';
import MonthView from '../components/calendar/MonthView.jsx';
import { CategoryTag } from '../components/StatusBadge.jsx';
import { taskService } from '../services/taskService.js';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useAsync from '../hooks/useAsync.js';
import useTaskModals from '../hooks/useTaskModals.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { CATEGORIES, STATUS_META } from '../utils/constants.js';
import { addDays, addMonths, formatDate, formatDateLong, formatMonthYear, monthGrid, startOfWeek } from '../utils/date.js';

function rangeFor(view, anchor) {
  if (view === 'day') return { from: anchor, to: anchor };
  if (view === 'week') {
    const s = startOfWeek(anchor);
    return { from: s, to: addDays(s, 6) };
  }
  const grid = monthGrid(anchor);
  return { from: grid[0], to: grid[grid.length - 1] };
}

function rangeTitle(view, anchor) {
  if (view === 'day') return formatDateLong(anchor);
  if (view === 'month') return formatMonthYear(anchor);
  const s = startOfWeek(anchor);
  const e = addDays(s, 6);
  return `${formatDate(s, { month: 'short', day: 'numeric' })} – ${formatDate(e, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function CalendarPage() {
  const { tz, today } = useUserTimezone();
  const { isLocked } = useEditingWindow();
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(today);
  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  const { data, loading, reload } = useAsync(() => taskService.list({ from: range.from, to: range.to, limit: 1000 }), [range.from, range.to]);
  const silentReload = useCallback(() => reload({ silent: true }), [reload]);
  const modals = useTaskModals(silentReload);
  const tasks = data?.items || [];

  const step = (dir) => {
    if (view === 'day') setAnchor((a) => addDays(a, dir));
    else if (view === 'week') setAnchor((a) => addDays(a, 7 * dir));
    else setAnchor((a) => addMonths(a, dir));
  };

  const openDay = (d) => {
    setAnchor(d);
    setView('day');
  };

  const canAdd = !isLocked && (view !== 'day' || anchor >= today);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" icon={ChevronLeft} onClick={() => step(-1)} aria-label="Previous" />
          <Button variant="secondary" size="icon" icon={ChevronRight} onClick={() => step(1)} aria-label="Next" />
          <Button variant="secondary" onClick={() => setAnchor(today)}>
            Today
          </Button>
          <h2 className="ml-2 text-lg font-semibold tracking-tight">{rangeTitle(view, anchor)}</h2>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
          <Button icon={Plus} onClick={() => modals.openEdit(null)} disabled={!canAdd}>
            <span className="hidden sm:inline">Add task</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
        <span className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <CategoryTag key={c} category={c} />
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-3">
          {Object.entries(STATUS_META).map(([k, m]) => {
            const Icon = m.icon;
            return (
              <span key={k} className="inline-flex items-center gap-1">
                <Icon className={`h-3.5 w-3.5 ${m.text}`} /> {m.label}
              </span>
            );
          })}
        </span>
      </div>

      <div className="card overflow-hidden p-3 sm:p-4">
        {loading ? (
          <Skeleton className="h-[520px]" />
        ) : view === 'day' ? (
          tasks.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled"
              description={anchor < today ? 'No tasks were scheduled on this day.' : 'Add a task to plan this day.'}
            />
          ) : (
            <>
              {anchor < today && <p className="mb-3 text-xs text-zinc-500">Past day — read-only.</p>}
              <Timeline tasks={tasks} tz={tz} isToday={anchor === today} onSelect={modals.openDetail} />
            </>
          )
        ) : view === 'week' ? (
          <WeekView start={range.from} tasks={tasks} today={today} tz={tz} onSelectTask={modals.openDetail} onSelectDay={openDay} />
        ) : (
          <MonthView anchor={anchor} tasks={tasks} today={today} onSelectTask={modals.openDetail} onSelectDay={openDay} />
        )}
      </div>

      <TaskModals modals={modals} defaultDate={anchor >= today ? anchor : today} onSaved={silentReload} />
    </div>
  );
}
