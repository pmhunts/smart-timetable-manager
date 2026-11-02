import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, ArrowRight, CopyPlus, Save } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import LockBanner from '../components/LockBanner.jsx';
import OverlapAlert from '../components/OverlapAlert.jsx';
import TaskRowsEditor from '../components/TaskRowsEditor.jsx';
import CopyFromTimetableModal from '../components/CopyFromTimetableModal.jsx';
import { timetableService } from '../services/timetableService.js';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useMutationError from '../hooks/useMutationError.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { emptyTask, formToPayload, taskToForm } from '../utils/task.js';
import { mapServerRowErrors, validateRows } from '../utils/rowErrors.js';
import { durationLabel, formatDate, formatDateLong, minutesToTime, timeToMinutes } from '../utils/date.js';
import { getErrorBody } from '../utils/errors.js';

const defaultTitle = (date) => `Plan for ${formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}`;

export default function CreateTimetable() {
  const navigate = useNavigate();
  const { today } = useUserTimezone();
  const { isLocked } = useEditingWindow();
  const handleError = useMutationError();

  const [scheduleDate, setScheduleDate] = useState(today);
  const [title, setTitle] = useState(defaultTitle(today));
  const titleTouched = useRef(false);
  const [rows, setRows] = useState(() => [emptyTask({ startTime: '06:00', endTime: '06:30', title: '', category: 'Personal' })]);
  const [rowErrors, setRowErrors] = useState({});
  const [overlap, setOverlap] = useState(null);
  const [existing, setExisting] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Warn early when the chosen date already has a timetable.
  useEffect(() => {
    let active = true;
    setExisting(null);
    if (!scheduleDate) return undefined;
    timetableService
      .getByDate(scheduleDate)
      .then((tt) => active && setExisting(tt || null))
      .catch(() => {});
    if (!titleTouched.current) setTitle(defaultTitle(scheduleDate));
    return () => {
      active = false;
    };
  }, [scheduleDate]);

  const onCopy = (tt) => {
    const copied = (tt.tasks || []).map((t) => taskToForm(t, { keepId: false }));
    setRows(copied.length ? copied : [emptyTask()]);
    setRowErrors({});
    toast.success(`Loaded ${copied.length} tasks from ${formatDate(tt.scheduleDate)}`);
  };

  const totalMinutes = rows.reduce((sum, r) => sum + Math.max(0, timeToMinutes(r.endTime) - timeToMinutes(r.startTime)), 0);

  const submit = async () => {
    setOverlap(null);
    if (!scheduleDate || scheduleDate < today) {
      toast.error('Pick today or a future date');
      return;
    }
    if (!title.trim()) {
      toast.error('Give your timetable a title');
      return;
    }
    if (!rows.length) {
      toast.error('Add at least one task');
      return;
    }
    const errs = validateRows(rows);
    setRowErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('Please fix the highlighted tasks');
      return;
    }

    setSaving(true);
    try {
      const created = await timetableService.create({
        title: title.trim(),
        scheduleDate,
        tasks: rows.map((r) => formToPayload(r, { includeId: false })),
      });
      toast.success('Timetable created');
      navigate(`/timetable/${created.id}`);
    } catch (err) {
      const code = handleError(err, 'Could not create the timetable');
      const body = getErrorBody(err);
      if (code === 'TASK_OVERLAP') setOverlap(body);
      if (code === 'TIMETABLE_EXISTS') setExisting({ id: body.existingId, title: 'Existing timetable' });
      setRowErrors(mapServerRowErrors(err, rows));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="page-title">Create Timetable</h2>
          <p className="text-sm text-zinc-500">Lay out your day hour by hour. Reminders are scheduled automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={CopyPlus} onClick={() => setCopyOpen(true)} disabled={isLocked}>
            Copy from previous
          </Button>
          <Button icon={Save} onClick={submit} loading={saving} disabled={isLocked || Boolean(existing)}>
            Save timetable
          </Button>
        </div>
      </div>

      <LockBanner />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card padded>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Date" type="date" min={today} value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} disabled={isLocked} />
              <Input
                label="Title"
                className="sm:col-span-2"
                value={title}
                maxLength={255}
                onChange={(e) => {
                  titleTouched.current = true;
                  setTitle(e.target.value);
                }}
                disabled={isLocked}
              />
            </div>
            {existing && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> A timetable already exists for {formatDateLong(scheduleDate)}. Open it to add or change tasks.
                </span>
                <Button to={`/timetable/${existing.id}`} variant="secondary" size="sm">
                  Open existing <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </Card>

          {overlap && <OverlapAlert conflicts={overlap.conflicts} message={overlap.message} />}
          {rowErrors._general && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {Object.values(rowErrors._general).join(' • ')}
            </div>
          )}

          <TaskRowsEditor rows={rows} onChange={setRows} errors={rowErrors} disabled={isLocked} />
        </div>

        <div className="space-y-4">
          <Card title="Summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Date</dt>
                <dd className="font-medium">{scheduleDate ? formatDate(scheduleDate) : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Tasks</dt>
                <dd className="font-medium">{rows.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Planned time</dt>
                <dd className="font-medium">{durationLabel('00:00', minutesToTime(totalMinutes)) || '0m'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Recurring</dt>
                <dd className="font-medium">{rows.filter((r) => r.repeatType !== 'NONE').length}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Tips">
            <ul className="list-disc space-y-1.5 pl-4 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Tasks can&apos;t overlap unless you enable “Allow overlap”.</li>
              <li>Recurring tasks are automatically added to upcoming days.</li>
              <li>You&apos;ll get WhatsApp / email reminders based on your Notification Center settings.</li>
              <li>Once your editing window closes, the timetable becomes read-only.</li>
            </ul>
          </Card>
        </div>
      </div>

      <CopyFromTimetableModal open={copyOpen} onClose={() => setCopyOpen(false)} onPick={onCopy} />
    </div>
  );
}
