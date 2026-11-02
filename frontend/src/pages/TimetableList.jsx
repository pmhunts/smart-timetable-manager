import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Archive, CalendarDays, Copy, Eye, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import LockBanner from '../components/LockBanner.jsx';
import DuplicateTimetableModal from '../components/DuplicateTimetableModal.jsx';
import { timetableService } from '../services/timetableService.js';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useAsync from '../hooks/useAsync.js';
import useMutationError from '../hooks/useMutationError.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { formatDate, parseDate } from '../utils/date.js';
import cn from '../utils/cn.js';

const STATUS_BADGE = { ACTIVE: 'green', LOCKED: 'red', ARCHIVED: 'zinc' };

function TimetableCard({ tt, today, onDuplicate, onDelete }) {
  const navigate = useNavigate();
  const d = parseDate(tt.scheduleDate);
  const pct = tt.taskCount ? Math.round((tt.completedCount / tt.taskCount) * 100) : 0;
  const isToday = tt.scheduleDate === today;

  return (
    <div className={cn('card group flex flex-col p-4 transition hover:shadow-lift', isToday && 'ring-2 ring-accent-500/40')}>
      <div className="flex items-start gap-3">
        <div className={cn('flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl', isToday ? 'bg-accent-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800')}>
          <span className="text-[10px] font-semibold uppercase opacity-80">{d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</span>
          <span className="text-xl font-semibold leading-none">{d.getUTCDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => navigate(`/timetable/${tt.id}`)} className="block max-w-full truncate text-left font-semibold hover:text-accent-600">
            {tt.title}
          </button>
          <p className="text-xs text-zinc-500">{formatDate(tt.scheduleDate, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {isToday && <Badge color="indigo">Today</Badge>}
            <Badge color={STATUS_BADGE[tt.status] || 'zinc'}>{tt.status}</Badge>
            {tt.isPast && (
              <Badge color="zinc" icon={Archive}>
                Read-only
              </Badge>
            )}
            {!tt.isPast && tt.isLocked && (
              <Badge color="red" icon={Lock}>
                Locked
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>
            {tt.completedCount ?? 0}/{tt.taskCount ?? 0} tasks completed
          </span>
          <span className="font-medium tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <Button variant="ghost" size="xs" icon={tt.isEditable ? Pencil : Eye} onClick={() => navigate(`/timetable/${tt.id}`)}>
          {tt.isEditable ? 'Open & edit' : 'View'}
        </Button>
        <Button variant="ghost" size="xs" icon={Copy} onClick={() => onDuplicate(tt)} disabled={tt.isLocked}>
          Duplicate
        </Button>
        <Button
          variant="ghost"
          size="xs"
          icon={Trash2}
          className="ml-auto hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/10"
          onClick={() => onDelete(tt)}
          disabled={!tt.isEditable}
          aria-label="Delete timetable"
        />
      </div>
    </div>
  );
}

export default function TimetableList() {
  const { today } = useUserTimezone();
  const { isLocked } = useEditingWindow();
  const handleError = useMutationError();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [dup, setDup] = useState(null);
  const [del, setDel] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, reload } = useAsync(
    () => timetableService.list({ page, limit: 12, from: filters.from || undefined, to: filters.to || undefined }),
    [page, filters.from, filters.to]
  );

  const setFilter = (key) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: e.target.value }));
  };

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await timetableService.remove(del.id);
      toast.success('Timetable deleted');
      setDel(null);
      reload({ silent: true });
    } catch (err) {
      handleError(err, 'Could not delete the timetable');
    } finally {
      setDeleting(false);
    }
  }, [del, handleError, reload]);

  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="page-title">My Timetable</h2>
          <p className="text-sm text-zinc-500">All your daily timetables — past ones stay available in read-only mode.</p>
        </div>
        <Button to="/timetable/new" icon={Plus} disabled={isLocked}>
          Create timetable
        </Button>
      </div>

      <LockBanner />

      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <Input label="From" type="date" value={filters.from} onChange={setFilter('from')} className="sm:w-48" />
        <Input label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={setFilter('to')} className="sm:w-48" />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setPage(1);
              setFilters({ from: today, to: '' });
            }}
          >
            Upcoming
          </Button>
          {(filters.from || filters.to) && (
            <Button
              variant="ghost"
              icon={X}
              onClick={() => {
                setPage(1);
                setFilters({ from: '', to: '' });
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CalendarDays}
            title={filters.from || filters.to ? 'No timetables in this range' : 'No timetables yet'}
            description="Create a timetable to plan your day hour by hour."
            action={
              <Button to="/timetable/new" icon={Plus} disabled={isLocked}>
                Create your first timetable
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((tt) => (
              <TimetableCard key={tt.id} tt={tt} today={today} onDuplicate={setDup} onDelete={setDel} />
            ))}
          </div>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}

      <DuplicateTimetableModal timetable={dup} open={Boolean(dup)} onClose={() => setDup(null)} onDuplicated={(tt) => navigate(`/timetable/${tt.id}`)} />
      <ConfirmDialog
        open={Boolean(del)}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete timetable?"
        message={del ? `“${del.title}” (${formatDate(del.scheduleDate)}) and all ${del.taskCount} of its tasks will be deleted. Pending reminders are cancelled.` : ''}
        confirmLabel="Delete timetable"
      />
    </div>
  );
}
