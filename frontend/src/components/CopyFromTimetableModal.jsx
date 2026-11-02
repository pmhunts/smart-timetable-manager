import { useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, ChevronRight } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import EmptyState from './ui/EmptyState.jsx';
import Pagination from './ui/Pagination.jsx';
import { SkeletonList } from './ui/Skeleton.jsx';
import { timetableService } from '../services/timetableService.js';
import useAsync from '../hooks/useAsync.js';
import { formatDate } from '../utils/date.js';
import { getErrorMessage } from '../utils/errors.js';

/** Lets the user pick an existing timetable; resolves with its full task list. */
export default function CopyFromTimetableModal({ open, onClose, onPick, excludeId }) {
  const [page, setPage] = useState(1);
  const [loadingId, setLoadingId] = useState(null);
  const { data, loading } = useAsync(() => (open ? timetableService.list({ page, limit: 8 }) : Promise.resolve(null)), [open, page]);

  const pick = async (tt) => {
    setLoadingId(tt.id);
    try {
      const full = await timetableService.get(tt.id);
      onPick(full);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingId(null);
    }
  };

  const items = (data?.items || []).filter((t) => t.id !== excludeId);

  return (
    <Modal open={open} onClose={onClose} title="Copy from a previous timetable" description="Its tasks will be loaded into the editor. Nothing is saved until you click Save." size="md">
      {loading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No timetables to copy" description="Create your first timetable from scratch." />
      ) : (
        <>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((tt) => (
              <li key={tt.id}>
                <button
                  type="button"
                  onClick={() => pick(tt)}
                  disabled={Boolean(loadingId)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-800/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tt.title}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(tt.scheduleDate)} · {tt.taskCount} tasks
                    </p>
                  </div>
                  {loadingId === tt.id ? <span className="text-xs text-zinc-500">Loading…</span> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
                </button>
              </li>
            ))}
          </ul>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </Modal>
  );
}
