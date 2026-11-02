import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Archive, ArrowLeft, CalendarDays, Copy, LayoutList, Lock, Pencil, Plus, Rows3, Save, Trash2, X } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import SegmentedControl from '../components/ui/SegmentedControl.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { SkeletonList } from '../components/ui/Skeleton.jsx';
import LockBanner from '../components/LockBanner.jsx';
import OverlapAlert from '../components/OverlapAlert.jsx';
import TaskCard from '../components/TaskCard.jsx';
import Timeline from '../components/Timeline.jsx';
import TaskRowsEditor from '../components/TaskRowsEditor.jsx';
import TaskModals from '../components/TaskModals.jsx';
import DuplicateTimetableModal from '../components/DuplicateTimetableModal.jsx';
import ProgressRing from '../components/ProgressRing.jsx';
import { timetableService } from '../services/timetableService.js';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useAsync from '../hooks/useAsync.js';
import useMutationError from '../hooks/useMutationError.js';
import useTaskModals from '../hooks/useTaskModals.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { formatDateLong } from '../utils/date.js';
import { formToPayload, sortByStart, taskToForm } from '../utils/task.js';
import { mapServerRowErrors, validateRows } from '../utils/rowErrors.js';
import { getErrorBody } from '../utils/errors.js';

export default function TimetableDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tz, today } = useUserTimezone();
  const { isLocked } = useEditingWindow();
  const handleError = useMutationError();

  const { data: tt, setData, loading, error, reload } = useAsync(() => timetableService.get(id), [id]);
  const silentReload = useCallback(() => reload({ silent: true }), [reload]);
  const modals = useTaskModals(silentReload);

  const [view, setView] = useState('list');
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [rows, setRows] = useState([]);
  const [rowErrors, setRowErrors] = useState({});
  const [overlap, setOverlap] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const editable = Boolean(tt) && !tt.isPast && !isLocked && tt.isEditable !== false;
  const tasks = sortByStart(tt?.tasks || []);
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;

  const startEditing = () => {
    setDraftTitle(tt.title);
    setRows(tasks.map((t) => taskToForm(t)));
    setRowErrors({});
    setOverlap(null);
    setEditing(true);
  };

  const save = async () => {
    setOverlap(null);
    if (!draftTitle.trim()) return toast.error('Title is required');
    const errs = validateRows(rows);
    setRowErrors(errs);
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted tasks');

    setSaving(true);
    try {
      const updated = await timetableService.update(tt.id, {
        title: draftTitle.trim(),
        tasks: rows.map((r) => formToPayload(r)),
      });
      setData(updated);
      setEditing(false);
      toast.success('Timetable saved');
    } catch (err) {
      const code = handleError(err, 'Could not save the timetable');
      if (code === 'TASK_OVERLAP') setOverlap(getErrorBody(err));
      if (code === 'EDITING_WINDOW_CLOSED') setEditing(false);
      setRowErrors(mapServerRowErrors(err, rows));
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await timetableService.remove(tt.id);
      toast.success('Timetable deleted');
      navigate('/timetable', { replace: true });
    } catch (err) {
      handleError(err, 'Could not delete the timetable');
      setDeleting(false);
      setDelOpen(false);
    }
  };

  const onTaskStatus = (updated) => {
    setData((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === updated.id ? updated : t)) } : prev));
    modals.onStatusChange(updated);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800" />
        <SkeletonList rows={5} />
      </div>
    );
  }

  if (error || !tt) {
    return (
      <div className="card">
        <EmptyState
          icon={CalendarDays}
          title={!error || /not found/i.test(error) ? 'Timetable not found' : 'Timetable unavailable'}
          description={error || 'It may have been deleted.'}
          action={
            <Button to="/timetable" variant="secondary" icon={ArrowLeft}>
              Back to timetables
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button onClick={() => navigate('/timetable')} className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            <ArrowLeft className="h-3.5 w-3.5" /> All timetables
          </button>
          {editing ? (
            <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} maxLength={255} className="max-w-md" aria-label="Timetable title" />
          ) : (
            <h2 className="page-title truncate">{tt.title}</h2>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{formatDateLong(tt.scheduleDate)}</span>
            {tt.scheduleDate === today && <Badge color="indigo">Today</Badge>}
            <Badge color={tt.status === 'ACTIVE' ? 'green' : tt.status === 'LOCKED' ? 'red' : 'zinc'}>{tt.status}</Badge>
            {tt.isPast && (
              <Badge icon={Archive} color="zinc">
                Past · read-only
              </Badge>
            )}
            {!tt.isPast && isLocked && (
              <Badge icon={Lock} color="red">
                Locked
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="secondary" icon={X} onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button icon={Save} onClick={save} loading={saving}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon={Copy} onClick={() => setDupOpen(true)} disabled={isLocked}>
                Duplicate
              </Button>
              {editable && (
                <>
                  <Button variant="secondary" icon={Trash2} onClick={() => setDelOpen(true)} className="hover:!text-rose-600">
                    Delete
                  </Button>
                  <Button icon={Pencil} onClick={startEditing}>
                    Edit timetable
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {!tt.isPast && <LockBanner />}

      {editing ? (
        <div className="space-y-4">
          {overlap && <OverlapAlert conflicts={overlap.conflicts} message={overlap.message} />}
          {rowErrors._general && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {Object.values(rowErrors._general).join(' • ')}
            </div>
          )}
          <p className="text-xs text-zinc-500">
            Removing a row deletes that task when you save. Changing a task&apos;s time sends an update notification if enabled.
          </p>
          <TaskRowsEditor rows={rows} onChange={setRows} errors={rowErrors} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card
            className="lg:col-span-2"
            title={`${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
            actions={
              <div className="flex items-center gap-2">
                {editable && (
                  <Button variant="soft" size="sm" icon={Plus} onClick={() => modals.openEdit(null)}>
                    Add task
                  </Button>
                )}
                <SegmentedControl
                  size="sm"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'list', label: <LayoutList className="h-3.5 w-3.5" /> },
                    { value: 'timeline', label: <Rows3 className="h-3.5 w-3.5" /> },
                  ]}
                />
              </div>
            }
          >
            {tasks.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No tasks in this timetable" description={editable ? 'Add tasks to plan your day.' : 'This timetable is read-only.'} />
            ) : view === 'timeline' ? (
              <Timeline tasks={tasks} tz={tz} isToday={tt.scheduleDate === today} onSelect={modals.openDetail} />
            ) : (
              <div className="space-y-2.5">
                {tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onOpen={modals.openDetail}
                    onStatusChange={tt.scheduleDate <= today ? onTaskStatus : undefined}
                    onEdit={modals.openEdit}
                    onDelete={modals.askDelete}
                    editable={editable}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title="Progress">
            <div className="flex flex-col items-center gap-4">
              <ProgressRing value={tasks.length ? (completed / tasks.length) * 100 : 0} sublabel={`${completed}/${tasks.length} done`} />
              <div className="grid w-full grid-cols-2 gap-2 text-center text-xs">
                {['UPCOMING', 'ONGOING', 'COMPLETED', 'MISSED', 'SKIPPED'].map((s) => (
                  <div key={s} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800/50">
                    <p className="text-lg font-semibold tabular-nums">{tasks.filter((t) => t.status === s).length}</p>
                    <p className="capitalize text-zinc-500">{s.toLowerCase()}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      <TaskModals modals={{ ...modals, onStatusChange: onTaskStatus }} defaultDate={tt.scheduleDate} onSaved={silentReload} />
      <DuplicateTimetableModal timetable={{ ...tt, taskCount: tasks.length }} open={dupOpen} onClose={() => setDupOpen(false)} onDuplicated={(n) => navigate(`/timetable/${n.id}`)} />
      <ConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete timetable?"
        message={`“${tt.title}” and its ${tasks.length} tasks will be deleted and pending reminders cancelled. You'll be notified if deletion alerts are on.`}
        confirmLabel="Delete timetable"
      />
    </div>
  );
}
