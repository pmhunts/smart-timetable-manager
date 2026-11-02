import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Info } from 'lucide-react';
import Input from './ui/Input.jsx';
import Button from './ui/Button.jsx';
import Toggle from './ui/Toggle.jsx';
import WeekdayPicker from './WeekdayPicker.jsx';
import EditingWindowStatus from './EditingWindowStatus.jsx';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import { settingsService } from '../services/settingsService.js';
import useMutationError from '../hooks/useMutationError.js';
import { formatTime12, normalizeTime, timeToMinutes } from '../utils/date.js';
import { getFieldErrors } from '../utils/errors.js';

const DEFAULTS = { editingEnabled: false, startTime: '06:00', endTime: '09:00', applicableDays: [1, 2, 3, 4, 5, 6, 7] };

/** "Timetable Configuration Window" settings form. */
export default function EditingWindowForm({ onSaved, showStatus = true }) {
  const { settings, isLocked, setData } = useEditingWindow();
  const handleError = useMutationError();
  const [form, setForm] = useState(DEFAULTS);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        editingEnabled: Boolean(settings.editingEnabled),
        startTime: normalizeTime(settings.startTime) || DEFAULTS.startTime,
        endTime: normalizeTime(settings.endTime) || DEFAULTS.endTime,
        applicableDays: settings.applicableDays?.length ? settings.applicableDays : DEFAULTS.applicableDays,
      });
    }
  }, [settings]);

  const overnight = form.startTime && form.endTime && timeToMinutes(form.endTime) <= timeToMinutes(form.startTime);

  const save = async (e) => {
    e?.preventDefault();
    const v = {};
    if (!form.startTime) v.startTime = 'Required';
    if (!form.endTime) v.endTime = 'Required';
    if (form.startTime && form.startTime === form.endTime) v.endTime = 'Must differ from start';
    if (!form.applicableDays.length) v.applicableDays = 'Select at least one day';
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    try {
      const res = await settingsService.updateEditingWindow(form);
      setData(res);
      toast.success('Editing window saved');
      onSaved?.(res);
    } catch (err) {
      handleError(err, 'Could not save editing window');
      setErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      {showStatus && <EditingWindowStatus />}

      <Toggle
        label="Enable timetable editing window"
        description="When on, you can only create, edit or delete timetable entries inside this window."
        checked={form.editingEnabled}
        onChange={(v) => setForm((f) => ({ ...f, editingEnabled: v }))}
        disabled={isLocked}
      />

      <div className={form.editingEnabled ? 'space-y-4' : 'pointer-events-none space-y-4 opacity-50'}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Creation start time" type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} error={errors.startTime} disabled={isLocked} />
          <Input label="Creation closing time" type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} error={errors.endTime} disabled={isLocked} />
        </div>
        {overnight && form.startTime !== form.endTime && (
          <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Closing time is before start time — the window runs overnight ({formatTime12(form.startTime)} → {formatTime12(form.endTime)} next day).
          </p>
        )}
        <div>
          <span className="label">Applicable days</span>
          <WeekdayPicker value={form.applicableDays} onChange={(days) => setForm((f) => ({ ...f, applicableDays: days }))} error={errors.applicableDays} disabled={isLocked} />
        </div>
        {form.editingEnabled && (
          <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
            From <b>{formatTime12(form.startTime)}</b> to <b>{formatTime12(form.endTime)}</b> on the selected days you can manage your timetable. At{' '}
            <b>{formatTime12(form.endTime)}</b> it locks automatically and stays read-only until the next window. The server enforces this — it cannot be
            bypassed.
          </p>
        )}
      </div>

      {isLocked && (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          The window is closed, so these settings are locked too. You can change them during the next allowed window.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={isLocked}>
          Save window
        </Button>
      </div>
    </form>
  );
}
